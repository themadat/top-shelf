import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

test('Notes buffers typing and flushes the latest draft once, including clearing a note',()=>{
 const timers=new Map(), saved=[]; let timer=0,persisted=0;
 const window={setTimeout:callback=>{timers.set(++timer,callback);return timer;}};
 const context=vm.createContext({window,clearTimeout:id=>timers.delete(id),saveNotes:value=>saved.push(value),storage:{saveNow:()=>persisted++}});
 for(const path of ['config.js','core/utils.js'])vm.runInContext(readFileSync(new URL('../assets/js/'+path,import.meta.url),'utf8'),context);
 const source=readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
 vm.runInContext('const u=window.LocalApp.utils;'+source.slice(source.indexOf('  let pendingNotes = null;'),source.indexOf('  function openNotes(')),context);
 vm.runInContext("pendingNotes='first';queueNotesSave();pendingNotes='latest';queueNotesSave();",context);
 assert.deepEqual(saved,[]);assert.equal(timers.size,1);
 vm.runInContext('flushNotes();flushNotes();',context);
 assert.deepEqual(saved,['latest']);assert.equal(persisted,1);assert.equal(timers.size,0);
 vm.runInContext("pendingNotes='';queueNotesSave();",context);
 [...timers.values()][0]();
 assert.deepEqual(saved,['latest','']);
 vm.runInContext('flushNotes();',context);assert.equal(saved.length,2);
});
