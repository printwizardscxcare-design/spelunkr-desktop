'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const INTERVAL=30*60*1000;
function usageConfig(value) {
  if(!value || !/^phc_[A-Za-z0-9_-]{12,200}$/.test(value.apiKey||'') ||
    !['https://us.i.posthog.com','https://eu.i.posthog.com'].includes(value.host) || value.privacyConfigured!==true) return null;
  return {apiKey:value.apiKey,host:value.host};
}
function createUsageReporter({profileDir,config,packaged=false,version='unknown',platform=process.platform,
  isActive=()=>false,io=fs,fetchEvent=globalThis.fetch,now=Date.now,uuid=randomUUID,
  setTimer=setInterval,clearTimer=clearInterval}) {
  const endpoint=usageConfig(config),file=path.join(profileDir,'usage.json');
  let state={consent:null,id:null,lastAttempt:0},busy=false,stopped=false,controller;
  try {
    const saved=JSON.parse(io.readFileSync(file,'utf8'));
    state={consent:typeof saved.consent==='boolean'?saved.consent:null,
      id:typeof saved.id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(saved.id)?saved.id:null,
      lastAttempt:Number.isFinite(saved.lastAttempt)&&saved.lastAttempt>=0&&saved.lastAttempt<=now()?saved.lastAttempt:0};
    if(state.consent!==true)state.id=null;
  }catch{}
  const configured=Boolean(endpoint&&packaged);
  const save=next=>{io.writeFileSync(file+'.tmp',JSON.stringify(next));io.renameSync(file+'.tmp',file);state=next;};
  async function tick() {
    if(stopped||busy||!configured||state.consent!==true||!state.id||now()-state.lastAttempt<INTERVAL)return false;
    try {if(!isActive())return false;}catch{return false;}
    busy=true;
    try {
      // Persist the attempt before sending. Restarts/offline failures cannot
      // generate a burst of events; failed events are not queued or replayed.
      save({...state,lastAttempt:now()});
      controller=new AbortController();const request=controller;
      const timeout=setTimeout(()=>request.abort(),5000);timeout.unref?.();
      try {
        const response=await fetchEvent(endpoint.host+'/i/v0/e/',{method:'POST',headers:{'Content-Type':'application/json'},
          credentials:'omit',redirect:'error',signal:controller.signal,
          body:JSON.stringify({api_key:endpoint.apiKey,event:'app_active',timestamp:new Date(now()).toISOString(),
            properties:{distinct_id:state.id,app_version:String(version).slice(0,48),$os:['win32','darwin','linux'].includes(platform)?platform:'other',
              $is_server:false,$process_person_profile:false,$geoip_disable:false}})});
        if(response.body?.cancel)await response.body.cancel();
        return response.ok;
      }finally {clearTimeout(timeout);}
    }catch {return false;}finally {busy=false;controller=null;}
  }
  function setConsent(value) {
    if(typeof value!=='boolean')return false;
    // In-flight requests are canceled on opt-out. Forget the identifier so a
    // later opt-in cannot link back to the previous reporting period.
    if(!value)controller?.abort();
    try {save({consent:value,id:value?(state.id||uuid()):null,lastAttempt:value?state.lastAttempt:0});}
    catch {if(!value)state={consent:false,id:null,lastAttempt:0};return false;}
    if(value)tick();return true;
  }
  const timer=setTimer(()=>tick(),60000);timer.unref?.();
  return {configured,tick,setConsent,snapshot:()=>({configured,consent:state.consent}),
    stop(){stopped=true;controller?.abort();clearTimer(timer);}};
}
module.exports={createUsageReporter,usageConfig,INTERVAL};
