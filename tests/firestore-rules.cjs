// Run against the demo Firestore emulator, never production.
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');
const fs=require('node:fs');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-idecal',firestore:{host:'127.0.0.1',port:8085,rules:fs.readFileSync(require('node:path').join(__dirname,'../firestore.rules'),'utf8')}});
 let passed=0;const yes=async p=>{await assertSucceeds(p);passed++},no=async p=>{await assertFails(p);passed++};
 try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();for(const [id,role]of [['owner','owner'],['manager','manager'],['staff','staff'],['other','staff'],['pending','pending'],['blocked','blocked']])await setDoc(doc(db,'users',id),{email:id+'@test.example',name:id,role});await setDoc(doc(db,'teamTasks','t'),{createdBy:'manager',assignee:'staff',status:'Cần làm',title:'Task'});await setDoc(doc(db,'supplierQuotes','q'),{name:'Test'})});
  const user=id=>env.authenticatedContext(id,{email:id+'@test.example',email_verified:true}).firestore();
  const owner=user('owner'),manager=user('manager'),staff=user('staff'),pending=user('pending'),blocked=user('blocked'),anon=env.unauthenticatedContext().firestore();
  await yes(getDocs(collection(manager,'supplierQuotes')));await no(getDocs(collection(staff,'supplierQuotes')));await no(getDocs(collection(anon,'supplierQuotes')));await yes(setDoc(doc(manager,'supplierQuotes','new'),{name:'Quote'}));await no(setDoc(doc(staff,'supplierQuotes','bad'),{name:'Quote'}));
  for(const db of [owner,manager,staff])await yes(getDocs(collection(db,'users')));await no(getDocs(collection(pending,'users')));await no(getDocs(collection(blocked,'users')));await yes(getDoc(doc(pending,'users','pending')));
  await yes(getDocs(collection(staff,'teamTasks')));await no(getDocs(collection(pending,'teamTasks')));await yes(updateDoc(doc(staff,'teamTasks','t'),{status:'Hoàn thành',updatedAt:'now'}));await no(updateDoc(doc(user('other'),'teamTasks','t'),{status:'Hoàn thành'}));await no(updateDoc(doc(staff,'teamTasks','t'),{title:'Hacked'}));await no(updateDoc(doc(staff,'teamTasks','t'),{assignee:'other'}));await no(updateDoc(doc(staff,'teamTasks','t'),{status:'invalid'}));await yes(setDoc(doc(manager,'teamTasks','new'),{createdBy:'manager',assignee:'staff',status:'Cần làm'}));await no(setDoc(doc(staff,'teamTasks','bad'),{createdBy:'staff',assignee:'staff',status:'Cần làm'}));await no(deleteDoc(doc(staff,'teamTasks','t')));
  const message={uid:'staff',name:'Staff',text:'Hello',createdAt:serverTimestamp()};await yes(setDoc(doc(staff,'teamMessages','ok'),message));await no(setDoc(doc(staff,'teamMessages','forged'),{...message,uid:'owner'}));await no(setDoc(doc(staff,'teamMessages','long'),{...message,text:'x'.repeat(2001)}));await no(setDoc(doc(pending,'teamMessages','pending'),{...message,uid:'pending'}));await no(updateDoc(doc(staff,'teamMessages','ok'),{text:'changed'}));await yes(getDocs(collection(staff,'teamMessages')));
  await no(updateDoc(doc(staff,'users','staff'),{role:'owner'}));await yes(updateDoc(doc(owner,'users','staff'),{role:'manager'}));await no(updateDoc(doc(owner,'users','owner'),{role:'staff'}));
  const newOwner=env.authenticatedContext('new-owner',{email:'idecals.net@gmail.com',email_verified:true}).firestore();await yes(setDoc(doc(newOwner,'users','new-owner'),{email:'idecals.net@gmail.com',name:'Owner',photo:'',role:'owner',createdAt:serverTimestamp()}));
  const newUser=env.authenticatedContext('new-user',{email:'new@test.example',email_verified:true}).firestore();await no(setDoc(doc(newUser,'users','new-user'),{email:'new@test.example',name:'User',photo:'',role:'owner',createdAt:serverTimestamp()}));await yes(setDoc(doc(newUser,'users','new-user'),{email:'new@test.example',name:'User',photo:'',role:'pending',createdAt:serverTimestamp()}));
  console.log(`PASS ${passed} Firestore permission assertions`);
 }finally{await env.cleanup()}
})().catch(e=>{console.error(e);process.exitCode=1});
