'use strict';
// Explicit maintainer test only. This event is excluded from app_active charts.
const {randomUUID}=require('node:crypto');
const {usageConfig}=require('../src/usage-reporter.cjs');
const config=usageConfig(require('../src/usage-config.json'));
if(!config)throw Error('Configure PostHog and its country-only privacy settings first.');
(async()=>{
  const id=randomUUID();
  for(const offset of [24*60*60*1000,0]) {
    const response=await fetch(config.host+'/i/v0/e/',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000),
      body:JSON.stringify({api_key:config.apiKey,event:'app_analytics_test',timestamp:new Date(Date.now()-offset).toISOString(),
        properties:{distinct_id:id,app_version:'integration-test',$os:process.platform,$is_server:false,$process_person_profile:false,$geoip_disable:false}})});
    if(!response.ok)throw Error(`Test event rejected (${response.status})`);
    await response.body?.cancel();
  }
  console.log('Two synthetic app_analytics_test events accepted. Verify one unique installation and country-only properties in PostHog.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
