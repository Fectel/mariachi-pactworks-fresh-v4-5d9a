import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.argv[2] || 'site';
const deny = [
  ['Google Maps key', new RegExp('AIza[0-9A-Za-z_-]{20,}', 'g')],
  ['Stripe secret', new RegExp('\\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{12,}\\b', 'g')],
  ['Stripe webhook secret', new RegExp('\\bwhsec_[0-9A-Za-z]{12,}\\b', 'g')],
  ['Supabase secret/service role', new RegExp('\\b(?:service_role|sb_secret_)[0-9A-Za-z._-]*', 'gi')],
  ['Database URL', new RegExp("\\bpostgres(?:ql)?://[^\\s\"\'<>]+", 'gi')],
  ['Private key', new RegExp('-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 'g')],
  ['GitHub token', new RegExp('\\b(?:ghp_|github_pat_)[0-9A-Za-z_]{20,}\\b', 'g')],
];
const textPattern=/[.](html|js|mjs|json|md|txt|toml|xml|svg|yml|yaml|sh|example)$/;
const findings=[];

async function walk(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()){await walk(p);continue;}
    if(entry.name.endsWith('.pactvault')) findings.push(`${p}: PactVault must not be shipped`);
    if(!textPattern.test(entry.name) && !entry.name.startsWith('.env')) continue;
    const text=await readFile(p,'utf8');
    for(const [label,re] of deny){
      re.lastIndex=0;
      if(re.test(text)) findings.push(`${p}: ${label}`);
    }
  }
}
await walk(root);
if(findings.length){console.error(findings.join('\n'));process.exit(1);}
console.log(`Secret scan PASS: ${root}`);
