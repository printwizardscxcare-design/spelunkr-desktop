'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createUsageReporter,usageConfig,INTERVAL}=require('../src/usage-reporter.cjs');
const config={apiKey:'phc_testprojecttoken123456',host:'https://us.i.posthog.com',privacyConfigured:true};
const flush=()=>new Promise(r=>setImmediate(r));
function setup({saved,packaged=true,configured=config,active=true}={}) {
  const files=new Map(saved?[['usage.json',JSON.stringify(saved)]]:[]),sent=[];let time=Math.max(1800000000000,saved?.lastAttempt||0),fail=false,isActive=active,serial=0;
  const name=file=>file.split(/[\\/]/).at(-1);
  const io={readFileSync:file=>{if(!files.has(name(file)))throw Error('Missing');return files.get(name(file));},
    writeFileSync(file,value){if(fail)throw Error('Disk full');files.set(name(file),value);},renameSync(a,b){files.set(name(b),files.get(name(a)));files.delete(name(a));}};
  const reporter=createUsageReporter({profileDir:'/profile',config:configured,packaged,version:'0.8.0-beta.1',platform:'win32',io,now:()=>time,isActive:()=>isActive,
    uuid:()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`,setTimer:()=>({unref(){}}),clearTimer(){},
    fetchEvent:async(url,request)=>{sent.push({url,request,body:JSON.parse(request.body)});return{ok:true};}});
  return {reporter,sent,files,advance:()=>{time+=INTERVAL;},active:v=>{isActive=v;},fail:()=>{fail=true;}};
}
test('no reporting or installation ID before consent; development and unconfigured builds never send',async()=>{
  for(const settings of [{},{packaged:false},{configured:{}},{configured:{...config,privacyConfigured:false}}]){
    const h=setup(settings);await h.reporter.tick();assert.equal(h.sent.length,0);assert.equal(h.files.size,0);
    if(settings.packaged===false||settings.configured){h.reporter.setConsent(true);await flush();assert.equal(h.sent.length,0);}
    h.reporter.stop();
  }
  assert.equal(usageConfig({...config,host:'https://other.example'}),null);
});
test('one allowlisted activity event per installation per interval; paused/unfocused activity is skipped',async()=>{
  const h=setup();assert.equal(h.reporter.setConsent(true),true);await flush();assert.equal(h.sent.length,1);
  const {body,request,url}=h.sent[0];assert.equal(url,config.host+'/i/v0/e/');assert.equal(request.credentials,'omit');assert.equal(request.redirect,'error');
  assert.deepEqual(Object.keys(body.properties).sort(),['distinct_id','app_version','$os','$is_server','$process_person_profile','$geoip_disable'].sort());
  assert.equal(body.event,'app_active');assert.equal(body.properties.$process_person_profile,false);
  await h.reporter.tick();assert.equal(h.sent.length,1);h.advance();h.active(false);await h.reporter.tick();assert.equal(h.sent.length,1);
  h.active(true);await h.reporter.tick();assert.equal(h.sent.length,2);h.reporter.stop();
  const persisted=JSON.parse(h.files.get('usage.json')),restarted=setup({saved:persisted});await restarted.reporter.tick();assert.equal(restarted.sent.length,0,'Restart cannot inflate counts');restarted.reporter.stop();
});
test('opting out stops events and forgets the ID; a later opt-in gets a new ID',async()=>{
  const h=setup();h.reporter.setConsent(true);await flush();const first=h.sent[0].body.properties.distinct_id;
  assert.equal(h.reporter.setConsent(false),true);assert.equal(JSON.parse(h.files.get('usage.json')).id,null);
  h.advance();await h.reporter.tick();assert.equal(h.sent.length,1);h.reporter.setConsent(true);await flush();assert.equal(h.sent.length,2);
  assert.notEqual(h.sent[1].body.properties.distinct_id,first);h.reporter.stop();
});
test('failed consent persistence sends nothing; failed opt-out persistence still stops this session',async()=>{
  const h=setup();h.fail();assert.equal(h.reporter.setConsent(true),false);await h.reporter.tick();assert.equal(h.sent.length,0);h.reporter.stop();
  const other=setup();other.reporter.setConsent(true);await flush();other.fail();assert.equal(other.reporter.setConsent(false),false);other.advance();await other.reporter.tick();assert.equal(other.sent.length,1);other.reporter.stop();
});
