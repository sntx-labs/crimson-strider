import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public');
const project=JSON.parse(fs.readFileSync(path.join(root,'labs-project.json')));
const assets=JSON.parse(fs.readFileSync(path.join(root,'labs-assets.json')));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(url==='/'){res.writeHead(302,{Location:'/experiments/'+project.slug+'/'});res.end();return;}
  if(url.endsWith('/'))url+='index.html';
  const asset=assets[url];
  if(asset){res.writeHead(200,{'Content-Type':asset.type,'Content-Length':asset.size});if(req.method==='HEAD'){res.end();return;}for(const part of asset.parts){res.write(await fs.promises.readFile(path.join(publicDir,part)));}res.end();return;}
  const file=path.resolve(publicDir,'.'+url);
  if(!file.startsWith(publicDir+path.sep)){res.writeHead(403);res.end();return;}
  const stat=await fs.promises.stat(file);if(!stat.isFile())throw Error('Not a file');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`${project.title}: http://127.0.0.1:${server.address().port}/experiments/${project.slug}/`));
