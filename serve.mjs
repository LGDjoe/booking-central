import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{
  try{
    let p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(p!==root&&!p.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    try{const s=await stat(p);if(s.isDirectory())p=resolve(p,'index.html');}catch{if(extname(p)){res.writeHead(404);res.end('Not found');return;}p=resolve(root,'index.html');}
    const body=await readFile(p);res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'0.0.0.0',()=>console.log('Booking Central: http://localhost:4173'));
