"""Run in an isolated Python environment against downloaded public artifacts.
Usage: python verify_model.py /tmp/lulu-privacy-spike
Never reads journal/user files. Fixtures come from the synthetic browser result.
"""
import sys, json, re, time, resource, platform
from pathlib import Path
from collections import Counter
import numpy as np
import onnx
import onnxruntime as ort
from tokenizers import Tokenizer

root = Path(sys.argv[1])
browser = json.loads((root / 'browser-result.json').read_text())
assert browser['status'] == 'passed'
tokenizer = Tokenizer.from_file(str(root / 'tokenizer.json'))
model = onnx.load(str(root / 'model_quantized.onnx'))
started = time.perf_counter()
session = ort.InferenceSession(str(root / 'model_quantized.onnx'), providers=['CPUExecutionProvider'])
load_ms = (time.perf_counter() - started) * 1000
labels = ['person', 'location', 'organization', 'email', 'phone number']
prompt = [part for label in labels for part in ['<<ENT>>', label]] + ['<<SEP>>']
cases = []
for case in browser['cases']:
    text = case['text']
    matches = list(re.finditer(r'\w+(?:[-_]\w+)*|\S', text))
    words = [m.group() for m in matches]
    encoding = tokenizer.encode(prompt + words, is_pretokenized=True)
    mask, previous = [], None
    for word_id in encoding.word_ids:
        mask.append(word_id - len(prompt) + 1 if word_id is not None and word_id >= len(prompt) and word_id != previous else 0)
        previous = word_id
    # Independent Rust tokenizer vs per-word Transformers.js path.
    assert encoding.ids == case['inputIds'], 'Tokenizer ID mismatch'
    assert mask == case['wordsMask'], 'Word-mask mismatch'
    indices = [[i, i + width] for i in range(len(words)) for width in range(12)]
    feeds = {
        'input_ids': np.array([encoding.ids], dtype=np.int64),
        'attention_mask': np.ones((1, len(encoding.ids)), dtype=np.int64),
        'words_mask': np.array([mask], dtype=np.int64),
        'text_lengths': np.array([[len(words)]], dtype=np.int64),
        'span_idx': np.array([indices], dtype=np.int64),
        'span_mask': np.array([[end < len(words) for start, end in indices]], dtype=np.bool_),
    }
    started = time.perf_counter()
    logits = session.run(['logits'], feeds)[0]
    elapsed = (time.perf_counter() - started) * 1000
    assert list(logits.shape) == case['outputDims']
    cases.append({'text': text, 'tokenizerAndMaskParity': True, 'cpuMs': elapsed, 'shape': list(logits.shape),
                  'utf16Words': [{'text':m.group(), 'start':len(text[:m.start()].encode('utf-16-le'))//2, 'end':len(text[:m.end()].encode('utf-16-le'))//2} for m in matches]})
result = {'environment':platform.platform(), 'python':platform.python_version(), 'onnxruntime':ort.__version__,
          'sessionLoadMs':load_ms, 'processPeakRssBytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
          'rssUnits':'bytes on macOS; includes graph inspection, Python and session, not phone memory',
          'opsets':[(o.domain,o.version) for o in model.opset_import],
          'operators':dict(Counter(n.domain+'::'+n.op_type for n in model.graph.node)),
          'inputs':[{'name':i.name,'type':i.type,'shape':i.shape} for i in session.get_inputs()],
          'outputs':[{'name':i.name,'type':i.type,'shape':i.shape} for i in session.get_outputs()], 'cases':cases}
(root/'python-result.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result,indent=2))
