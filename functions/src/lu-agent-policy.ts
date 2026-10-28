const searchStopWords = new Set(['the','and','for','with','about','from','that','this','what','when','where','which','who','why','how','did','does','do','can','could','would','should','you','your','my','me','i','we','our','please','tell','show','find','search','look','open','read','journal','journals','story','stories','entry','entries','write','wrote','saved','recent','latest','access','there','their','was','were','are','is','a','an','to','in','on','of','it','person','people','place','location','organisation','organization','date','time','contact','email','phone','relationship','detail','details']);

export function luSearchTerms(value: string): string[] {
  return [...new Set((value.normalize('NFKC').toLocaleLowerCase('und').match(/[\p{L}\p{N}]{3,}/gu) ?? [])
    .filter(word => !searchStopWords.has(word)))].slice(0,24);
}

export function explicitlyRequestsSurfaceSearch(value: string): boolean {
  const asksToFind = /\b(find|search|look\s+for|read|show\s+me|summari[sz]e|what\s+did\s+i\s+(?:write|say|save)|where\s+did\s+i\s+(?:write|mention)|what\s+does\s+my\s+(?:journal|story|entry)\s+say)\b/iu.test(value);
  const namesWriting = /\b(journal|journals|story|stories|entry|entries|saved\s+writing|what\s+i\s+wrote)\b/iu.test(value);
  return asksToFind && namesWriting;
}

export function explicitlyRequestsOpen(value: string): boolean {
  return /\b(open|read|show\s+me|display)\b/iu.test(value) && /\b(entry|entries|journal|story|stories|result|one)\b/iu.test(value);
}

export function explicitlyRequestsDraft(value: string): boolean {
  return /\b(create|write|start|make|draft)\b/iu.test(value) && /\b(entry|journal|story|note)\b/iu.test(value);
}

export function explicitlyRequestsDestination(value: string, destination: string): boolean {
  if (!/\b(open|go\s+to|take\s+me\s+to|navigate\s+to)\b/iu.test(value)) return false;
  const terms: Record<string,RegExp> = {
    home:/\b(home|dashboard)\b/iu,
    journal:/\b(journal|journals)\b/iu,
    stories:/\b(stories|story collection)\b/iu,
    library:/\b(library|tasks|notes)\b/iu,
    reader:/\b(reader|latest entry)\b/iu,
    write:/\b(write|writing|compose|new entry|new journal|new story)\b/iu,
    settings:/\b(settings|preferences)\b/iu,
  };
  return terms[destination]?.test(value) ?? false;
}
