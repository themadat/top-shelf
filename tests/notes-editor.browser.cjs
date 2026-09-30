// Optional browser regression: serve the app, then run with Playwright available.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
for (const engine of [chromium]) {
 const browser=await engine.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1500,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.NOTES_TEST_URL || 'http://localhost:8000');await page.waitForSelector('html.app-ready');await page.locator('#notesButton').click();
 const editor=page.locator('#notesTextarea');
 const fixture=async html=>{await editor.evaluate((e,html)=>{e.innerHTML=html;e.dispatchEvent(new Event('input',{bubbles:true}));},html);};
 const caret=async(selector,offset=0,select=false)=>{await editor.evaluate((e,{selector,offset,select})=>{e.focus();const n=selector?e.querySelector(selector):e;const r=document.createRange();r.selectNodeContents(n);if(!select)r.collapse(offset===0);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));},{selector,offset,select});};
 await fixture('<h1>First</h1>Loose text<div><p>Body</p><h2>Child</h2><p>Nested content</p></div><h1>Next</h1><p>Visible</p>');
 await page.getByRole('button',{name:'Collapse Child',exact:true}).click();
 assert.equal(await editor.locator('p').nth(1).isVisible(),false);
 await page.getByRole('button',{name:'Collapse First',exact:true}).click();
 assert.equal(await editor.locator('h2').isVisible(),false);assert.equal(await editor.locator('p').first().isVisible(),false);
 assert.equal(await editor.locator('span').first().isVisible(),false);assert.equal(await editor.locator('h1').nth(1).isVisible(),true);
 await page.getByRole('button',{name:'Expand First',exact:true}).click();
 assert.equal(await editor.locator('h2').isVisible(),true);assert.equal(await editor.locator('p').nth(1).isVisible(),false);
 await page.getByRole('button',{name:'Expand Child',exact:true}).click();
 assert.equal(await editor.locator('p').nth(1).isVisible(),true);
 assert.equal(await editor.locator('button').count(),0);
 // Empty heading is removable and never gains a non-editable control.
 await fixture('<h1><br></h1><p>Keep</p>');await caret('h1');await page.keyboard.press('Backspace');
 assert.equal(await editor.locator('h1').count(),0);assert.match(await editor.innerText(),/Keep/);
 await fixture('<h2>Title</h2>');await caret('h2',1);await page.keyboard.press('Enter');await page.keyboard.type('Body');
 assert.equal(await editor.locator('h2').innerText(),'Title');assert.equal(await editor.locator('p').innerText(),'Body');
 // Enter from a collapsed heading must expose the new paragraph.
 await fixture('<h2>Folded</h2><p>Retained</p>');await page.getByRole('button',{name:'Collapse Folded',exact:true}).click();await caret('h2',1);await page.keyboard.press('Enter');await page.keyboard.type('New body');
 assert.equal(await editor.locator('p').first().innerText(),'New body');assert.equal(await editor.locator('p').first().isVisible(),true);assert.match(await editor.innerText(),/Retained/);
 await page.getByRole('button',{name:'Collapse Folded',exact:true}).click();await caret('h2',0,true);await page.keyboard.press('Backspace');assert.equal(await page.locator('.notes-collapse-toggle').count(),0);assert.equal(await editor.locator('p').last().isVisible(),true);
 // Undo/redo must preserve editable text and leave no embedded buttons.
 await fixture('<p>Original</p>');await caret('p',1);await page.keyboard.insertText(' added');await page.keyboard.press('Meta+z');assert.equal(await editor.innerText(),'Original');await page.keyboard.press('Meta+Shift+z');assert.equal(await editor.innerText(),'Original added');
 // All seven keyboard shortcuts and toolbar state.
 for (const modifier of ['Meta','Control']) {
 await fixture('<p>Format me</p>');await caret('p',0,true);
 for (let level=1;level<=3;level++) {await page.keyboard.press(`${modifier}+Shift+Digit${level}`);assert.equal(await editor.locator('h'+level).count(),1);assert.equal(await page.locator(`[data-notes-command="h${level}"]`).getAttribute('aria-pressed'),'true');}
 await page.keyboard.press(`${modifier}+Shift+KeyB`);assert.equal(await editor.locator('h1,h2,h3').count(),0);assert.equal(await editor.locator('p').count(),1);assert.equal(await page.locator('.notes-collapse-toggle').count(),0);
 await page.keyboard.press(`${modifier}+KeyB`);assert.equal(await editor.locator('b,strong').count(),1);
 await page.keyboard.press(`${modifier}+KeyI`);assert.equal(await editor.locator('i,em').count(),1);
 await page.keyboard.press(`${modifier}+KeyK`);await page.locator('#notesLinkUrl').fill('javascript:alert(1)');await page.keyboard.press('Enter');assert.equal(await editor.locator('a').count(),0);
 await page.locator('#notesLinkUrl').fill('https://example.com/notes');await page.keyboard.press('Enter');assert.equal(await editor.locator('a').getAttribute('href'),'https://example.com/notes');
 }
 // Persist all content even while folded, then reload.
 await fixture('<h1>Saved heading</h1><p><strong>Saved body</strong> <a href="https://example.com">Link</a></p>');
 await page.getByRole('button',{name:'Collapse Saved heading',exact:true}).click();
 await page.getByRole('button',{name:'Close Notes',exact:true}).click();await page.reload();await page.waitForSelector('html.app-ready');await page.locator('#notesButton').click();
 assert.match(await editor.innerText(),/Saved body/);assert.equal(await editor.locator('strong').count(),1);assert.equal(await editor.locator('button').count(),0);
 assert.ok((await page.locator('#notesDialog').boundingBox()).width>1400);

 for(const width of [390,320]) {await page.setViewportSize({width,height:844});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.notes-writing-surface').evaluate(e=>e.scrollWidth<=e.clientWidth));await page.getByRole('button',{name:'Collapse Saved heading',exact:true}).click();assert.equal(await editor.locator('p').isVisible(),false);await page.getByRole('button',{name:'Expand Saved heading',exact:true}).click();}
 assert.deepEqual(errors,[]);
 console.log(`${engine.name()}: nested collapse, loose text, empty-heading removal, Enter to body, all Meta/Control shortcuts, safe links, folded persistence/reload, desktop and 390/320px mobile passed.`);
 }finally{await browser.close();}
}
})().catch(e=>{console.error(e);process.exit(1)});
