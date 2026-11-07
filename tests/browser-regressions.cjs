// Run with an existing static server: IDECAL_TEST_URL=http://127.0.0.1:8010 node tests/browser-regressions.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/config.js',route=>route.fulfill({contentType:'application/javascript',body:'window.IDECAL_CONFIG={firebase:{}};'}));
  await page.goto(process.env.IDECAL_TEST_URL||'http://127.0.0.1:8010',{waitUntil:'networkidle'});
  await page.evaluate(()=>{db=blank();db.orders.push({id:'o',code:'DHQA',date:today(),status:'Mới',paid:false,items:[{name:'Decal',qty:1,price:1000000,cost:400000}]});save();view='orders';render()});
  const original=await page.evaluate(()=>localStorage.getItem(KEY));
  for(const bad of ['{"orders":"broken"}','{"orders":[],"products":{}}','{"orders":[{"id":"o","code":"DH1","date":"2026-11-07","items":"bad"}]}']){
   await page.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(bad)});
   await page.waitForTimeout(80);
   assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),original);
   assert.equal(await page.evaluate(()=>db.orders[0].code),'DHQA');
  }
  console.log('PASS invalid backups leave memory and persisted data unchanged');
  await page.evaluate(()=>depositForm('o'));
  await page.locator('[name=amount]').fill('2000000');
  assert.equal(await page.locator('[name=amount]').evaluate(e=>e.validity.rangeOverflow),true);
  // Bypass HTML validity to exercise the callback's independent guard.
  await page.locator('form.md').evaluate(e=>e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(await page.evaluate(()=>dep(db.orders[0])),0);
  await page.locator('[name=amount]').fill('400000');await page.getByRole('button',{name:'Lưu',exact:true}).click();
  assert.equal(await page.evaluate(()=>orderDue(db.orders[0])),600000);
  await page.evaluate(()=>depositForm('o'));assert.equal(await page.locator('[name=amount]').getAttribute('max'),'600000');
  await page.locator('[name=amount]').fill('600000');await page.getByRole('button',{name:'Lưu',exact:true}).click();
  assert.equal(await page.evaluate(()=>db.orders[0].paid&&orderDue(db.orders[0])===0),true);
  console.log('PASS overpayment rejected, partial and full payment balances correct');
  const valid=await page.evaluate(()=>JSON.stringify(db));
  await page.locator('#file').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(valid)});
  await page.waitForTimeout(80);await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>db.orders[0].deposits.length),2);
  assert.deepEqual(errors,[]);console.log('PASS valid backup roundtrip and reload; no browser errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
