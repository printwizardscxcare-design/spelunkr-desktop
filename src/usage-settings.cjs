'use strict';
function createUsageSettings({win,dialog,reporter}) {
  let showing=false;
  async function open() {
    if(showing||win.isDestroyed())return;
    showing=true;
    try {
      const state=reporter.snapshot();
      if(!state.configured) {
        await dialog.showMessageBox(win,{type:'info',title:'Usage statistics',message:'Usage reporting is not configured in this build.',
          detail:'No app usage statistics are sent. Reporting requires a configured PostHog project and your opt-in.',buttons:['OK']});return;
      }
      const enabled=state.consent===true;
      const result=await dialog.showMessageBox(win,{type:'question',title:'Optional usage statistics',
        message:enabled?'Anonymous usage reporting is on.':'Help count active installations and countries?',
        detail:'Optional. PostHog receives a random installation ID, app version, operating system, and an activity signal at most once every 30 minutes while the app is in use. It estimates your country from your connection’s IP address; the configured project discards IP addresses and keeps country-level location only.\n\nNo names, email addresses, channel names, viewing history, audio, subtitles, or screen recordings are sent. This counts participating installations, not individual people. You can change your choice under Settings → Usage statistics. Turning it off stops reporting and forgets this installation’s reporting ID.',
        buttons:enabled?['Turn off reporting','Keep enabled']:['Enable reporting','No thanks'],defaultId:1,cancelId:1,noLink:true});
      if(win.isDestroyed())return;
      const consent=enabled?result.response!==0:result.response===0;
      if(!reporter.setConsent(consent))await dialog.showMessageBox(win,{type:'error',title:'Usage statistics',message:'Your choice could not be saved. Try again.',buttons:['OK']});
    }finally {showing=false;}
  }
  return {open,offer(){if(reporter.configured&&reporter.snapshot().consent===null)return open();return Promise.resolve();}};
}
module.exports={createUsageSettings};
