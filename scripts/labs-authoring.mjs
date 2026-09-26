import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import './labs-build.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project=JSON.parse(fs.readFileSync(path.join(root,'labs-project.json')));
const source=project.authoringSnapshot||(project.slug==='lilac-frontier'?'public/experiments/lilac-frontier/source/lilac-frontier':null);
if(!source){console.log('This project can be edited directly in its runtime files or original source.');}
else{
 const publicDir=path.join(root,source,'public');
 const assets=path.join(root,'dist/experiments',project.slug,'assets');
 if(fs.existsSync(assets))fs.cpSync(assets,path.join(publicDir,'assets'),{recursive:true});
 fs.cpSync(path.join(root,'public/ui'),path.join(publicDir,'ui'),{recursive:true});
 if(project.slug==='lilac-frontier')fs.cpSync(path.join(root,'public/experiments/lilac-frontier/licenses'),path.join(publicDir,'licenses'),{recursive:true});
 console.log(`Authoring assets prepared. In ${source}, run npm ci and npm run build. Authoring snapshots may predate Labs-specific changes; see LABS.md.`);
}
