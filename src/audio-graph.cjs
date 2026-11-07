'use strict';
// Also embedded in the sandboxed player preload and exercised with real Web Audio.
module.exports = function createAudioGraph(context, source, model, denoiser) {
  const dry = context.createGain(), wet = context.createGain(), input = context.createGain();
  let suspended=false;
  const preamp = context.createGain(), compressor = context.createDynamicsCompressor(), makeup = context.createGain();
  const level = context.createGain(), limiter = context.createDynamicsCompressor(), analyser = context.createAnalyser();
  const eq = model.BANDS.map(frequency => {
    const node = context.createBiquadFilter(); node.type = 'peaking'; node.frequency.value = Math.min(frequency, context.sampleRate * .45);node.Q.value = 1.4;return node;
  });
  analyser.fftSize = 2048;
  source.connect(dry).connect(context.destination); source.connect(analyser).connect(input);
  limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.001;limiter.release.value=.08;
  const set = (param, value, immediate = false) => {
    param.cancelScheduledValues(context.currentTime);
    if (immediate) param.setValueAtTime(value, context.currentTime);else param.setTargetAtTime(value, context.currentTime, .025);
  };
  let settings = model.defaults(), route = '', gainDb = 0;
  const samples = new Float32Array(analyser.fftSize);
  function apply(value, immediate = false) {
    settings = model.settings(value);
    const enabled = model.active(settings);
    // Rewire only when topology changes. Slider movement keeps audio continuous.
    const key = `${settings.position}/${settings.eq}/${settings.compression}/${settings.denoise>0}`;
    if (route !== key) {
      for (const node of [input, preamp, ...eq, compressor, makeup, level, limiter, wet]) node.disconnect();
      denoiser?.disconnect();
      const equalizer = settings.eq ? [preamp,...eq] : [];
      const dynamics = settings.compression ? [compressor,makeup] : [];
      const nodes = [input, ...(settings.denoise>0&&denoiser?[denoiser]:[]), level, ...(settings.position === 'pre' ? [...dynamics,...equalizer] : [...equalizer,...dynamics]), limiter,wet,context.destination];
      for (let i=0;i<nodes.length-1;i++) nodes[i].connect(nodes[i+1]);
      route = key;
    }
    set(dry.gain, enabled ? 0 : 1, immediate);set(wet.gain, enabled ? 1 : 0, immediate);
    const headroom = Math.max(0,...settings.bands);
    set(preamp.gain,model.dbToGain(-headroom),immediate);
    eq.forEach((node,i) => set(node.gain,settings.bands[i],immediate));
    for (const [name,value] of Object.entries(model.compressor(settings.amount))) set(compressor[name],value,immediate);
    set(makeup.gain,model.dbToGain(settings.makeup),immediate);
    if (denoiser) set(denoiser.parameters.get('amount'),settings.denoise,immediate);
    if (!settings.normalize || !enabled) gainDb = 0;
    set(level.gain,model.dbToGain(gainDb),immediate);
  }
  function meter(volume = 1, seconds = .05) {
    analyser.getFloatTimeDomainData(samples);
    let sum=0,peak=0;for (const value of samples) {sum+=value*value;peak=Math.max(peak,Math.abs(value));}
    if (settings.enabled && settings.normalize) {
      gainDb = model.normalization({rms:Math.sqrt(sum/samples.length),peak,volume,previous:gainDb,seconds});
      set(level.gain,model.dbToGain(gainDb));
    }
    return {gainDb, reduction:settings.enabled && settings.compression ? compressor.reduction : 0, peak};
  }
  const reset = () => {gainDb=0;set(level.gain,1,true);denoiser?.port.postMessage('reset');};
  const suspend = () => {if(suspended)return;source.disconnect();dry.disconnect();wet.disconnect();suspended=true;};
  const resume = () => {if(!suspended)return;source.connect(dry).connect(context.destination);source.connect(analyser);wet.connect(context.destination);suspended=false;};
  const destroy = () => {for (const node of [source,dry,wet,input,preamp,...eq,compressor,makeup,level,limiter,analyser]) node.disconnect();denoiser?.disconnect();};
  apply(settings,true);
  return {apply,meter,reset,destroy,suspend,resume};
};
