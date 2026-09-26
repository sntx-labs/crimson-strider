import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=JSON.parse(fs.readFileSync(path.join(root,'labs-assets.json')));
const hashes=JSON.parse(fs.readFileSync(path.join(root,'labs-snapshot.sha256.json')));
for(const [file,expected] of Object.entries(hashes)){
 if(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')!==expected)throw Error('Snapshot mismatch: '+file);
}
for(const [url,asset] of Object.entries(assets)){
 const hash=crypto.createHash('sha256');let size=0;
 for(const part of asset.parts){const data=fs.readFileSync(path.join(root,'public',part));size+=data.length;hash.update(data);}
 if(size!==asset.size||hash.digest('hex')!==asset.sha256)throw Error('Asset mismatch: '+url);
}
for(const file of ['ui/experience-shell.js','ui/experience-shell.css','ui/construction.css','ui/sh-panel/sh-panel.js','ui/sh-panel/sh-panel.css','ui/labs-panels.js','images/syntax-badge.svg']){
 if(!fs.existsSync(path.join(root,'public',file)))throw Error('Missing shared dependency: '+file);
}
console.log(`Verified ${Object.keys(hashes).length} published files and ${Object.keys(assets).length} reconstructed assets.`);
