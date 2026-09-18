import { chromium } from "playwright";
import fs from 'node:fs';
const live=JSON.parse(fs.readFileSync('tasks/pre-peptides-audit-20260915/live-v2-result.json','utf8'));
const browser=await chromium.launch({headless:true});
const checks=[];
for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
 const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}}); const errors=[];
 page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/api/peptides-preview/analyze',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,leadId:'qa-v2',submissionId:'qa-v2',result:live.result,checkoutUrl:'/peptides-engine?tier=solo&utm_source=qa'})}));
 await page.goto('http://127.0.0.1:5001/peptides-preview',{waitUntil:'networkidle'});
 const cookieButton=page.getByRole('button',{name:/Accepter|Tout accepter|Accept/i}).first(); if(await cookieButton.count()) await cookieButton.click();
 await page.getByLabel('Prénom').fill('Alex'); await page.getByLabel('Email').fill('alex@example.com'); await page.getByLabel('Âge').fill('36'); await page.getByLabel('Poids actuel').fill('82'); await page.getByLabel('Taille').fill('181');
 await page.getByRole('button',{name:/Continuer/}).click();
 await page.getByRole('button',{name:/Récupération Tendons/}).click(); await page.getByLabel('Étendue').selectOption('multi-site'); await page.getByLabel('Situation, historique, résultat attendu').fill('Je veux récupérer plusieurs zones après une charge sportive élevée et éviter un protocole générique.');
 await page.getByRole('button',{name:/Continuer/}).click();
 await page.getByLabel('Bilan sanguin').selectOption('recent'); await page.getByLabel('Tension artérielle').selectOption('normal'); await page.getByLabel('Sommeil moyen').fill('7'); await page.getByLabel('Médicaments actuels').fill('aucun'); await page.getByLabel('Allergies').fill('aucune');
 await page.getByRole('button',{name:/Continuer/}).click();
 await page.getByLabel('Expérience peptides').selectOption('read'); await page.getByLabel('Entraînements par semaine').selectOption('5plus'); await page.getByLabel('Peptides actuels').fill('aucun'); await page.getByLabel('Peptides passés et résultats').fill('aucun');
 await page.getByRole('button',{name:/Continuer/}).click();
 await page.getByLabel('Budget total du cycle en USD').fill('500'); await page.getByRole('button',{name:/Continuer/}).click();
 await page.getByRole('checkbox').check(); await page.getByRole('button',{name:/Calculer mon devis/}).click(); await page.getByText(/Total rendu estimé/i).first().waitFor(); await page.waitForTimeout(700);
 const body=(await page.locator('body').innerText()).replace(/\s+/g,' '); const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 for(const term of ['Dose de référence','Calcul vérifiable','minimum','achat opérationnel','Livraison','Total rendu estimé','Équivalent quatre semaines','Débloquer mon protocole complet']) if(!body.toLowerCase().includes(term.toLowerCase())) errors.push(`missing:${term}`);
 const shot=`tasks/pre-peptides-audit-20260915/v2-${vp.name}.png`; await page.screenshot({path:shot,fullPage:true}); checks.push({...vp,overflow,errors,textLength:body.length,screenshot:shot}); await page.close();
}
await browser.close(); const status=checks.every(c=>!c.overflow&&!c.errors.length)?'PASS':'FAIL'; fs.writeFileSync('tasks/pre-peptides-audit-20260915/ui-v2-audit.json',JSON.stringify({status,checks},null,2)); console.log(JSON.stringify({status,checks},null,2)); if(status!=='PASS')process.exit(1);
