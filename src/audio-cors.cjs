'use strict';
// Public Archive media is playable, but some file servers omit CORS headers.
// Permit anonymous Web Audio access only to public media files in this player's
// session; no general web-security bypass or credential-bearing API access.
function audioCorsHeaders(details, isPlayer) {
  if (!isPlayer(details) || !['media','xhr'].includes(details.resourceType)) return null;
  let url;try {url=new URL(details.url);} catch {return null;}
  if (url.protocol!=='https:' || url.username || url.password || url.port ||
    !(url.hostname==='archive.org'||url.hostname.endsWith('.archive.org')) ||
    !/^\/(download\/|\d+\/items\/)/.test(url.pathname) || !/\.(mp4|m4v|webm|mov|mp3|m4a|ogg|wav)$/i.test(url.pathname)) return null;
  const headers={...details.responseHeaders};
  for(const key of Object.keys(headers))if(key.toLowerCase()==='access-control-allow-origin')delete headers[key];
  headers['Access-Control-Allow-Origin']=['*'];return headers;
}
function configureAudioCors(session,isPlayer) {
  session.webRequest.onHeadersReceived({urls:['https://archive.org/download/*','https://*.archive.org/*']},(details,callback)=>{
    const responseHeaders=audioCorsHeaders(details,isPlayer);callback(responseHeaders?{responseHeaders}:{});
  });
}
module.exports={audioCorsHeaders,configureAudioCors};
