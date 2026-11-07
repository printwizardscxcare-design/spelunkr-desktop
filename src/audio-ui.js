'use strict';
(async function() {
  const $=id=>document.getElementById(id), api=window.audioSettings, model=window.AudioModel;
  let config, presets=[], timer, saving=Promise.resolve(), lastStatus='Original sound', dirty=false;
  const signed=value=>`${value>0?'+':''}${Number(value).toFixed(1)} dB`;
  const message=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
  const selected=()=>presets.find(p=>p.key===$('preset').value);
  function list(selection) {
    presets=[...model.PRESETS.map(p=>({...p,key:p.id,builtIn:true})),...config.presets.map((p,i)=>({...p,key:`user-${i}`,description:'Your saved sound.'}))];
    $('preset').replaceChildren();
    for (const p of presets) {const o=document.createElement('option');o.value=p.key;o.textContent=`${p.builtIn?'':'★ '}${p.name}`;$('preset').append(o);}
    $('preset').value=selection && presets.some(p=>p.key===selection)?selection:presets.find(p=>JSON.stringify(p.settings)===JSON.stringify(config.current))?.key || 'original';
    describe();
  }
  function describe() {
    const p=selected();$('preset-description').textContent=p?.description || '';
    $('update-preset').disabled=!p || p.builtIn;$('delete-preset').disabled=!p || p.builtIn;
    if (p && !p.builtIn) $('preset-name').value=p.name;
  }
  function render() {
    const s=config.current;
    for (const id of ['enabled','normalize','compression','linked','eq']) $(id).checked=s[id];
    $('cleanup').checked=config.cleanup;
    $('amount').value=s.amount;$('makeup').value=s.makeup;$('denoise').value=s.denoise;$(s.position).checked=true;
    s.bands.forEach((value,i)=>$(`band-${i}`).value=value);readouts();
  }
  function readouts() {
    const s=config.current;
    $('amount-value').textContent=`${Math.round(s.amount)}%`;$('makeup-value').textContent=signed(s.makeup);
    $('denoise-value').textContent=s.denoise?`${Math.round(s.denoise)}%`:'Off';
    $('makeup').disabled=s.linked;$('makeup').setAttribute('aria-describedby','link-help');
    s.bands.forEach((value,i)=>$(`band-value-${i}`).textContent=signed(value));
    $('modified').textContent=JSON.stringify(selected()?.settings)===JSON.stringify(s)?'Preset loaded':'Custom sound';
    $('signal').textContent=!s.enabled?'Audio effects bypassed':s.position==='pre'?'Signal: Denoiser → Normalization → Compression → EQ → Output limiter':'Signal: Denoiser → Normalization → EQ → Compression → Output limiter';
  }
  function persist() {
    clearTimeout(timer);
    // Serialize writes so a slow save cannot restore an earlier slider position.
    const value=JSON.parse(JSON.stringify(config));
    saving=saving.then(async()=>{try {const result=await api.save(value);if(!result.ok)throw Error(result.error);if(JSON.stringify(config)===JSON.stringify(value))dirty=false;message(`Saved · ${lastStatus}`);return true;}catch(error){dirty=true;message(error.message,true);return false;}});
    return saving;
  }
  function changed() {
    config.current=model.settings(config.current);readouts();dirty=true;message('Saving…');clearTimeout(timer);timer=setTimeout(persist,120);
  }
  try {
    const snapshot=await api.load();config=model.config(snapshot.config);lastStatus=snapshot.status.text;
    model.BANDS.forEach((frequency,i)=>{
      const band=document.createElement('div');band.className='band';
      const output=document.createElement('output');output.id=`band-value-${i}`;output.htmlFor=`band-${i}`;
      const input=document.createElement('input');input.type='range';input.min='-12';input.max='12';input.step='.5';input.id=`band-${i}`;
      input.setAttribute('aria-label',`${frequency} Hz gain`);input.setAttribute('aria-orientation','vertical');
      const label=document.createElement('label');label.htmlFor=input.id;label.textContent=frequency>=1000?`${frequency/1000}k`:frequency;
      input.addEventListener('input',()=>{config.current.bands[i]=Number(input.value);changed();});band.append(output,input,label);$('bands').append(band);
    });
    list();render();message(`Saved · ${lastStatus}`);
    for (const id of ['enabled','normalize','compression','linked','eq']) $(id).addEventListener('change',()=>{config.current[id]=$(id).checked;changed();render();});
    $('cleanup').addEventListener('change',()=>{config.cleanup=$('cleanup').checked;changed();});
    for (const id of ['amount','makeup','denoise']) $(id).addEventListener('input',()=>{config.current[id]=Number($(id).value);changed();$('makeup').value=config.current.makeup;});
    for (const position of ['pre','post']) $(position).addEventListener('change',()=>{config.current.position=position;changed();});
    $('preset').addEventListener('change',describe);
    $('load-preset').addEventListener('click',()=>{const p=selected();if(!p)return;config.current=model.settings(p.settings);render();changed();});
    $('flat').addEventListener('click',()=>{config.current.bands=model.BANDS.map(()=>0);render();changed();});
    $('save-preset').addEventListener('click',()=>{
      const name=$('preset-name').value.trim();
      if(!name)return message('Give your preset a name first.',true);
      if(presets.some(p=>p.name.toLowerCase()===name.toLowerCase()))return message('That name is already in the memory bank. Choose another name or Update your preset.',true);
      if(config.presets.length>=32)return message('The memory bank holds 32 custom presets. Delete one to make room.',true);
      config.presets.push({name,settings:model.settings(config.current)});list(`user-${config.presets.length-1}`);readouts();persist();
    });
    $('update-preset').addEventListener('click',()=>{const p=selected();if(!p||p.builtIn)return;config.presets[Number(p.key.slice(5))].settings=model.settings(config.current);list(p.key);readouts();persist();});
    $('delete-preset').addEventListener('click',()=>{const p=selected();if(!p||p.builtIn)return;config.presets.splice(Number(p.key.slice(5)),1);list();readouts();persist();});
    $('done').addEventListener('click',async()=>{if(await persist())api.close();});
    // A native window close also flushes the final slider position.
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';persist().then(ok=>{if(ok)api.close();});}});
    api.onStatus(value=>{lastStatus=value.text;$('level-meter').textContent=`Level adjustment: ${signed(value.gainDb||0)}`;$('compression-meter').textContent=`Gain reduction: ${signed(value.reduction||0)}`;if(!$('status').classList.contains('error')&&!dirty)message(`Saved · ${lastStatus}`);});
  } catch(error) {message(error.message,true);}
})();
