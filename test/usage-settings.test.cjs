'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const {createUsageSettings}=require('../src/usage-settings.cjs');
test('first-use reporting is opt-in, declining is remembered, and unconfigured builds do not prompt',async()=>{
  let consent=null,prompts=0;const changes=[];
  const reporter={configured:true,snapshot:()=>({configured:true,consent}),setConsent:v=>{consent=v;changes.push(v);return true;}};
  const dialog={showMessageBox:async(_win,options)=>{prompts++;assert.equal(options.defaultId,1);assert.equal(options.cancelId,1);assert.equal(options.buttons[0],'Enable reporting');return{response:1};}};
  const ui=createUsageSettings({win:{isDestroyed:()=>false},dialog,reporter});await ui.offer();await ui.offer();
  assert.deepEqual(changes,[false]);assert.equal(prompts,1);
  reporter.configured=false;consent=null;await ui.offer();assert.equal(prompts,1);
});
test('enabling and disabling can be changed from native settings without exposing a page API',async()=>{
  let consent=null;const reporter={configured:true,snapshot:()=>({configured:true,consent}),setConsent:v=>{consent=v;return true;}};
  const ui=createUsageSettings({win:{isDestroyed:()=>false},reporter,dialog:{showMessageBox:async()=>({response:0})}});
  await ui.open();assert.equal(consent,true);await ui.open();assert.equal(consent,false);
});
