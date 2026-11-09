'use strict';
module.exports = function installAudio({ipcRenderer, document, window, model, createGraph, workletSource}) {
  let settings = model.defaults(), context, selected, lastSource = '', busy = false, status = 'Original sound';
  const graphs = new WeakMap(), failures = new WeakMap();let activeGraph;
  const report = (extra = {}) => ipcRenderer.send('audio:status',{text:status,...extra});
  const currentVideo = () => document.querySelector('.stage-video-col video, video');
  function resume(event) {if (event.isTrusted && context?.state === 'suspended') context.resume().catch(()=>{});}
  document.addEventListener('pointerdown',resume,true);document.addEventListener('keydown',resume,true);
  async function attach() {
    const video=currentVideo();
    if (video !== selected) {activeGraph?.suspend();activeGraph=null;selected=video;lastSource='';}
    const source=video?.currentSrc;
    if (!video || !source || busy) return;
    if (source !== lastSource) {lastSource=source;graphs.get(video)?.reset();}
    if (graphs.has(video)) {if(!activeGraph){activeGraph=graphs.get(video);activeGraph.resume();activeGraph.apply(settings);}return;}
    if (failures.get(video) === source) return;
    if (!model.active(settings)) return;
    busy=true;
    try {
      // Never redirect an opaque, non-CORS media response into Web Audio: it would
      // become permanently silent. Check access before changing the player.
      if (video.crossOrigin !== 'anonymous') {
        const response = await window.fetch(source,{method:'HEAD',mode:'cors',credentials:'omit',signal:window.AbortSignal.timeout(10000)});
        if (!response.ok || response.type === 'opaque') throw Error('This channel does not allow audio processing. Original sound is playing.');
        if (video !== currentVideo() || source !== video.currentSrc || !model.active(settings)) return;
        const time=video.currentTime, paused=video.paused;
        video.crossOrigin='anonymous';
        await new Promise((resolve,reject) => {
          const timeout=window.setTimeout(()=>done(Error('Audio could not reconnect. Reload the channel to try again.')),15000);
          const ready=()=>done(), failed=()=>done(Error('Audio could not reconnect. Reload the channel to try again.'));
          function done(error) {window.clearTimeout(timeout);video.removeEventListener('loadedmetadata',ready);video.removeEventListener('error',failed);error?reject(error):resolve();}
          video.addEventListener('loadedmetadata',ready,{once:true});video.addEventListener('error',failed,{once:true});video.load();
        });
        if (video !== currentVideo() || source !== video.currentSrc) return;
        if (Number.isFinite(time)) video.currentTime=time;
        if (!paused) video.play().catch(()=>{});
      }
      if (!context) {
        context=new window.AudioContext({latencyHint:'interactive'});
        const blob=window.URL.createObjectURL(new window.Blob([workletSource],{type:'text/javascript'}));
        try {await context.audioWorklet.addModule(blob);} catch(error) {await context.close();context=null;throw error;}
        finally {window.URL.revokeObjectURL(blob);}
      }
      if (video!==currentVideo() || source!==video.currentSrc || !model.active(settings)) return;
      const denoiser=new window.AudioWorkletNode(context,'spelunkr-tape-denoiser',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
      const guard=new window.AudioWorkletNode(context,'spelunkr-transition-guard',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
      const graph=createGraph(context,context.createMediaElementSource(video),model,denoiser,guard);
      graph.apply(settings,true);graphs.set(video,graph);activeGraph=graph;
      await context.resume();
      status='Audio processing ready';report();
    } catch (error) {failures.set(video,source);status=error.message || 'Audio processing is unavailable on this channel.';report();}
    finally {busy=false;}
  }
  ipcRenderer.on('desktop:audio-state',(_event,value) => {
    settings=model.settings(value);
    activeGraph?.apply(settings);
    if (selected) failures.delete(selected);
    status=model.active(settings) ? 'Preparing audio…' : 'Original sound';
    report();attach();
  });
  let ticks=0;
  window.setInterval(()=>{
    attach();
    const graph=graphs.get(selected);
    if (graph) {
      const meter=graph.meter(selected.muted ? 0 : selected.volume);
      if (++ticks%10===0) {status=!model.active(settings)?'Original sound':context.state==='running'?'Audio processing ready':'Click the player to start audio';report(meter);}
    }
  },50);
  window.addEventListener('pagehide',()=>{activeGraph?.destroy();context?.close();},{once:true});
  ipcRenderer.send('audio:ready');
};
