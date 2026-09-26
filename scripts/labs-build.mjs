import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=JSON.parse(fs.readFileSync(path.join(root,'labs-assets.json')));
const project=JSON.parse(fs.readFileSync(path.join(root,'labs-project.json')));
fs.cpSync(path.join(root,'public'),path.join(root,'dist'),{recursive:true});
for(const [url,asset] of Object.entries(assets)){
 const buffer=Buffer.concat(asset.parts.map(part=>fs.readFileSync(path.join(root,'public',part))));
 if(buffer.length!==asset.size||crypto.createHash('sha256').update(buffer).digest('hex')!==asset.sha256)throw Error('Invalid asset '+url);
 fs.writeFileSync(path.join(root,'dist',url),buffer);
}
fs.writeFileSync(path.join(root,'dist/index.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/experiments/${project.slug}/"><a href="/experiments/${project.slug}/">Open ${project.title}</a>`);
console.log('Built dist/ with all runtime assets. Serve dist/ as the website root.');
