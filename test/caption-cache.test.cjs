'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {CaptionCache} = require('../src/caption-cache.cjs');
const {sourceRequest} = require('../src/caption-read-ahead.cjs');

test('cached subtitles follow media timestamps instead of recognition arrival',() => {
  const cache = new CaptionCache();cache.reset(1);
  cache.add({session:1,startMs:10000,endMs:12000,text:'First phrase'});
  cache.add({session:1,startMs:15000,endMs:17000,text:'Second phrase'});
  const render = time => cache.render(time,40,s=>s.length).text;
  assert.equal(render(0),'');assert.equal(render(9999),'');assert.equal(render(10000),'First phrase');
  assert.equal(render(11999),'First phrase');assert.equal(render(12000),'');assert.equal(render(14500),'');
  assert.equal(render(15000),'Second phrase');assert.equal(render(17000),'');
  assert.equal(render(10500),'First phrase','Seeking within cached media uses its timestamp again');
  assert.equal(render(0),'','A wall-clock wait never moves a cue onto a paused earlier frame');
});
test('reset discards earlier-channel cues and rejects late results from the old session',() => {
  const cache = new CaptionCache();cache.reset(1);cache.add({session:1,startMs:0,endMs:1000,text:'Old'});
  cache.reset(2);cache.add({session:1,startMs:0,endMs:1000,text:'Late old'});
  assert.equal(cache.render(500,40,s=>s.length).text,'');
  cache.add({session:2,startMs:0,endMs:1000,text:'New'});assert.equal(cache.render(500,40,s=>s.length).text,'New');
});
test('long cached cues replace whole two-line cards within the cue duration',() => {
  const cache = new CaptionCache();cache.reset(1);cache.add({session:1,startMs:0,endMs:10000,text:'one two three four five six seven eight'});
  const first = cache.render(0,10,s=>s.length).text, last = cache.render(9999,10,s=>s.length).text;
  assert.equal(first,'one two\nthree four');assert.ok(last.includes('eight'));assert.ok(last.split('\n').length <= 2);
  assert.equal(cache.render(10000,10,s=>s.length).text,'');
});
test('only bounded HTTPS archive sources can reach the native audio reader',() => {
  assert.equal(sourceRequest({session:1,startMs:15000,url:'https://archive.org/download/test/test.mp4'}).startMs,15000);
  for (const url of ['file:///C:/secret','http://archive.org/test','https://127.0.0.1/','https://archive.org.evil.test/file','https://user:pass@archive.org/test'])
    assert.throws(()=>sourceRequest({session:1,startMs:0,url}));
  assert.throws(()=>sourceRequest({session:1,startMs:NaN,url:'https://archive.org/test'}));
});

test('a short adjacent sentence tail joins the preceding cue without extending silence',() => {
  const cache = new CaptionCache();cache.reset(1);
  cache.add({session:1,startMs:0,endMs:3000,text:'The rest of the sentence'});
  cache.add({session:1,startMs:3000,endMs:3300,text:'ends here.'});
  assert.equal(cache.render(3200,100,s=>s.length).text,'The rest of the sentence ends here.');
  assert.equal(cache.render(3300,100,s=>s.length).text,'');
  cache.add({session:1,startMs:6000,endMs:6200,text:'No.'});assert.equal(cache.render(5000,100,s=>s.length).text,'');
});
