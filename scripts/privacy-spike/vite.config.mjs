import fs from 'node:fs';
import path from 'node:path';
const root = process.env.LULU_SPIKE_DIR || '/tmp/lulu-privacy-spike';
const repo = process.env.LULU_REPO_ROOT || process.cwd();
export default {
  root,
  resolve: { alias: { '@lulu/privacyProcessor': path.join(repo, 'src/services/privacy/privacyProcessor.ts') } },
  optimizeDeps: { exclude: ['@cantoo/capacitor-onnx'] },
  server: { host:'127.0.0.1', port:5186, strictPort:true, fs:{ allow:[root, fs.realpathSync(root), path.join(repo,'src')] } },
  plugins: [{ name:'synthetic-evidence', configureServer(server) {
    server.middlewares.use('/evidence', (req,res) => {
      if (req.method !== 'POST') { res.statusCode=405; res.end(); return; }
      let body='';
      req.on('data', chunk => { body+=chunk; if(body.length>100000) req.destroy(); });
      req.on('end', () => { fs.writeFileSync(path.join(root,'browser-result.json'),body); res.end('ok'); });
    });
  } }],
};
