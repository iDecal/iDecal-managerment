const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function sandbox(){
 const context=vm.createContext({console,Set,Map,JSON,Number,Object,Error,Promise});
 vm.runInContext(`
 const COLS=['customers','products','orders','quotes','purchases','expenses','supplierQuotes'];
 let db=blank(),ready=true,loaded={customers:true},synced={customers:{},counters:'{"seq":0,"qseq":0,"pseq":0}',shop:'{}',suppliers:'[]',workers:'[]'};
 const cntObj=()=>({seq:db.seq,qseq:db.qseq,pseq:db.pseq});const isMgr=()=>true;
 const toast=()=>{};
 let calls=[],fail=false,release=null,hold=false;
 let fs={collection:c=>({doc:id=>c+'/'+id}),batch:()=>{const writes=[];return {set:(ref,data)=>writes.push({ref,data}),delete:ref=>writes.push({ref,deleted:true}),commit:()=>{calls.push(writes);return fail?Promise.reject(Error('unavailable')):hold?new Promise(r=>release=r):Promise.resolve()}}}};
 ${section('function blank(){','function load(){')}
 ${section('let cloudSaveState=null;','\nconst hasLocal=')}
 ${section('function validateBackup(value){',"$('#file').onchange=")}
 `,context);
 return {run:s=>vm.runInContext(s,context),context};
}
test('backup roundtrip accepts current and older optional fields',()=>{const s=sandbox();s.run(`db.orders=[{id:'o',code:'DH1',date:'2026-11-07',items:[{name:'Decal',qty:2,price:100,cost:40}],deposits:[{amount:50,date:'2026-11-07'}]}]`);assert.equal(s.run('validateBackup(JSON.parse(JSON.stringify(db))).orders.length'),1);assert.equal(s.run('validateBackup({orders:[]}).customers.length'),0)});
test('backup rejects malformed arrays, duplicate IDs, nested items, counters, prototype keys',()=>{const s=sandbox();for(const input of ['{"orders":"broken"}','{"orders":[],"products":{}}','{"orders":[],"seq":-1}','{"orders":[],"customers":[{"id":"x"},{"id":"x"}]}','{"orders":[{"id":"o","code":"DH1","date":"2026-11-07","items":"broken"}]}','{"orders":[],"__proto__":{}}','{"orders":[],"customers":[{"id":"x","name":{}}]}'])assert.throws(()=>s.run(`validateBackup(JSON.parse(${JSON.stringify(input)}))`));});
test('failed cloud commit remains dirty and retries on next save',async()=>{const s=sandbox();s.run("db.customers=[{id:'a',name:'QA'}];fail=true");await s.run('cloudSave()');assert.equal(s.run('Object.hasOwn(synced.customers,"a")'),false);s.run('fail=false');await s.run('cloudSave()');assert.equal(s.run('calls.length'),2);assert.equal(s.run('synced.customers.a'),'{"id":"a","name":"QA"}');});
test('successful unchanged cloud save does not repeat writes',async()=>{const s=sandbox();s.run("db.customers=[{id:'a',name:'QA'}]");await s.run('cloudSave()');await s.run('cloudSave()');assert.equal(s.run('calls.length'),1)});
test('edits during in-flight cloud save serialize and preserve newest value',async()=>{const s=sandbox();s.run("db.customers=[{id:'a',name:'first'}];hold=true;windowSave=cloudSave()");s.run("db.customers[0].name='latest';cloudSave();hold=false;release()");await s.run('windowSave');await new Promise(r=>setImmediate(r));assert.equal(s.run('calls.length'),2);assert.equal(s.run('calls[1][0].data.name'),'latest');assert.equal(s.run('JSON.parse(synced.customers.a).name'),'latest')});
test('failed delete remains retryable',async()=>{const s=sandbox();s.run("synced.customers.a=JSON.stringify({id:'a',name:'QA'});fail=true");await s.run('cloudSave()');assert.equal(s.run('Object.hasOwn(synced.customers,"a")'),true);s.run('fail=false');await s.run('cloudSave()');assert.equal(s.run('Object.hasOwn(synced.customers,"a")'),false);assert.equal(s.run('calls.length'),2)});
test('partial batch failure acknowledges only successful chunks',async()=>{const s=sandbox();s.run(`db.customers=Array.from({length:401},(_,i)=>({id:String(i),name:'QA'}));let n=0;const original=fs.batch;fs.batch=()=>{const b=original();b.commit=()=>++n===2?Promise.reject(Error('unavailable')):Promise.resolve();return b}`);await s.run('cloudSave()');assert.equal(s.run('Object.keys(synced.customers).length'),400);s.run('fs.batch=original');await s.run('cloudSave()');assert.equal(s.run('Object.keys(synced.customers).length'),401)});
test('remote snapshots preserve unsaved edits and deletions but apply clean remote changes',()=>{const s=sandbox();s.run(`db.customers=[{id:'a',name:'local'},{id:'c',name:'clean'}];synced.customers={a:JSON.stringify({id:'a',name:'old'}),b:JSON.stringify({id:'b',name:'deleted'}),c:JSON.stringify({id:'c',name:'clean'})};mergeCloudCollection('customers',[{id:'a',name:'remote'},{id:'b',name:'deleted'},{id:'c',name:'changed'},{id:'d',name:'new'}])`);assert.equal(s.run('db.customers.find(x=>x.id==="a").name'),'local');assert.equal(s.run('db.customers.some(x=>x.id==="b")'),false);assert.equal(s.run('db.customers.find(x=>x.id==="c").name'),'changed');assert.equal(s.run('db.customers.find(x=>x.id==="d").name'),'new')});
test('session change prevents old commit acknowledgment and queued writes',async()=>{const s=sandbox();s.run("db.customers=[{id:'a',name:'QA'}];hold=true;windowSave=cloudSave();cloudSave();synced={};ready=false;release()");await s.run('windowSave');assert.equal(s.run('Object.keys(synced).length'),0);assert.equal(s.run('calls.length'),1)});
