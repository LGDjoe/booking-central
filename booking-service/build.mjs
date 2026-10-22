import {build} from 'esbuild';
import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['src/index.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
try {await cp('drizzle','dist/drizzle',{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}
