import {readFile,mkdir,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile('dist/data/data.json','utf8'));
const html=await readFile('dist/index.html','utf8');
for(const path of ['privacy-policy','terms-condition',...data.venues.map(v=>'complex/'+v.slug)]){
  if(!/^[a-zA-Z0-9_/-]+$/.test(path))throw new Error('Unexpected venue slug: '+path);
  await mkdir('dist/'+path,{recursive:true});await writeFile('dist/'+path+'/index.html',html);
}
await writeFile('dist/404.html',html);
console.log('Prepared '+(data.venues.length+2)+' direct routes.');
