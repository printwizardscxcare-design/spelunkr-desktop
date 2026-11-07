'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {audioCorsHeaders}=require('../src/audio-cors.cjs');
test('audio CORS permits only public Archive media files in this player',()=>{
  const request={url:'https://ia801902.us.archive.org/1/items/tape/file.mp4',resourceType:'media',responseHeaders:{'Content-Type':['video/mp4']}};
  assert.equal(audioCorsHeaders(request,()=>true)['Access-Control-Allow-Origin'][0],'*');
  for(const value of [
    {...request,url:'https://archive.org/account/login'},
    {...request,url:'https://evilarchive.org/1/items/tape/file.mp4'},
    {...request,url:'https://archive.org/metadata/tape'},
    {...request,url:'http://archive.org/download/tape/file.mp4'},
    {...request,resourceType:'mainFrame'},
    {...request,url:'https://user:pass@archive.org/download/tape/file.mp4'}
  ])assert.equal(audioCorsHeaders(value,()=>true),null);
  assert.equal(audioCorsHeaders(request,()=>false),null);
});
