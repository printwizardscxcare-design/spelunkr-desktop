'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),local={};
try {
  for(const line of fs.readFileSync(path.join(root,'.env.stats.local'),'utf8').split(/\r?\n/)) {
    const match=line.match(/^(POSTHOG_PROJECT_TOKEN|POSTHOG_HOST|POSTHOG_PRIVACY_CONFIGURED)=(.*)$/);
    if(match)local[match[1]]=match[2].trim();
  }
}catch{}
const value=key=>process.env[key]||local[key]||'';
const config={apiKey:value('POSTHOG_PROJECT_TOKEN'),host:value('POSTHOG_HOST'),privacyConfigured:value('POSTHOG_PRIVACY_CONFIGURED')==='1'};
fs.writeFileSync(path.join(root,'src/usage-config.json'),JSON.stringify(config));
