'use strict';
// Listening effects never enter the recognizer. Both paths preserve sample time.
const captionAudioFilter = cleanup => cleanup === true
  ? 'highpass=f=85,afftdn=nr=6:nf=-45:tn=1,lowpass=f=7600'
  : 'highpass=f=60';
module.exports={captionAudioFilter};
