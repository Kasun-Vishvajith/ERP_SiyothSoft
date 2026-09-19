const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('path');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 const page = await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 const rows=[{id:1,number:'INV-001',customerId:1,customerName:'Aster Trading',date:'2026-09-19',total:'245000.00',amountPaid:'185000.00',balance:'60000.00',paymentStatus:'PARTIALLY_PAID'}, {id:2,number:'INV-002',customerId:2,customerName:'Ceylon Design Co.',date:'2026-09-18',total:'168000.00',amountPaid:'168000.00',balance:'0.00',paymentStatus:'PAID'}, {id:3,number:'INV-003',customerId:3,customerName:'Northline Studio',date:'2026-09-17',total:'92000.00',amountPaid:'0.00',balance:'92000.00',paymentStatus:'UNPAID'}];
 let signedIn=true;
 await page.route('**/api/**', async route=>{
  const u=new URL(route.request().url()); let body;
  if(u.pathname==='/api/me') { if(!signedIn) return route.fulfill({status:401,contentType:'application/json',body:'{}'}); body={username:'Kasun'}; }
  else if(u.pathname==='/api/invoices') { const q=u.searchParams.get('q')||''; const status=u.searchParams.get('status')||'ALL'; const content=rows.filter(r=>(r.customerName.toLowerCase().includes(q.toLowerCase())||r.number.includes(q))&&(status==='ALL'||r.paymentStatus===status)); body={content,page:0,size:3,totalElements:content.length,totalPages:content.length?1:0}; }
  else if(u.pathname==='/api/products') body={content:[{id:1,name:'Office supplies',price:'2500.00',stockCount:24}],page:0,size:100,totalElements:1,totalPages:1};
  else if(u.pathname==='/api/csrf') body={token:'test',headerName:'X-CSRF-TOKEN'};
  else body={content:[],page:0,size:20,totalElements:0,totalPages:0};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 const check=async label=>{if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(label+' overflows');};
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('heading',{name:'Make every sale count.'}).waitFor();
 await check('desktop');
 await page.screenshot({path:path.resolve('docs/evidence/ui-redesign/desktop.png'),fullPage:true});
 await page.getByLabel('Search invoices').fill('Northline');
 await page.getByRole('cell',{name:'Northline Studio',exact:true}).waitFor();
 if(await page.locator('tbody tr').count()!==1)throw Error('Search failed');
 await page.getByLabel('Search invoices').fill('');
 await page.getByRole('cell',{name:'Aster Trading',exact:true}).waitFor();
 await page.locator('#invoice-status').selectOption('PAID');
 await page.getByRole('cell',{name:'Ceylon Design Co.',exact:true}).waitFor();
 if(await page.locator('tbody tr').count()!==1)throw Error('Filter failed');
 await page.getByRole('button',{name:'New invoice',exact:false}).click();
 await page.getByRole('heading',{name:'New invoice',exact:true}).waitFor();
 await check('invoice form');
 for(const name of ['Products','Inventory','Customers','Suppliers','Purchases','Payments']) { await page.getByRole('button',{name,exact:false}).first().click(); await page.waitForTimeout(150); await check(name); }
 await page.getByRole('button',{name:'Invoices',exact:false}).first().click();
 await page.getByRole('heading',{name:'Make every sale count.'}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await check('mobile invoices');
 await page.screenshot({path:path.resolve('docs/evidence/ui-redesign/mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Open navigation'}).click();
 await page.locator('.sidebar--open').getByRole('button',{name:'Inventory',exact:false}).click();
 await page.getByRole('heading',{name:'Inventory count'}).waitFor();
 await check('mobile inventory');
 if(await page.locator('.sidebar--open').count())throw Error('Drawer did not close');
 signedIn=false;
 await page.reload();
 await page.getByRole('heading',{name:'Welcome back'}).waitFor();
 await check('mobile login');
 await page.setViewportSize({width:1440,height:960});
 await page.screenshot({path:path.resolve('docs/evidence/ui-redesign/login.png'),fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: desktop/mobile overflow, invoice search/filter, form navigation, all seven modules, mobile drawer, login, zero browser errors. Fixtures only; no production records modified.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});



