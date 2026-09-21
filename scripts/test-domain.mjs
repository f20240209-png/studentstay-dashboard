import ts from 'typescript';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = await fs.readFile('lib/studentstay.ts','utf8');
const {outputText} = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const domain = await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
const snapshot = JSON.parse(await fs.readFile('lib/current-sheet.json','utf8'));
const data = domain.normalize(snapshot.sheets,snapshot.asOf,false);
assert.equal(data.offers.length,9); assert.equal(data.transcripts.length,8);
assert.deepEqual(data.offers.reduce((r,o)=>(r[o.eligibility]=(r[o.eligibility]||0)+1,r),{}),{ELIGIBLE:4,INELIGIBLE:3,NEEDS_INFO:2});
assert.equal(data.actions.filter(a=>a.status==='DRAFTED').length,1);
const baseline=domain.previewOffers(data.offers,data.preferences);
for(const actual of data.offers){const computed=baseline.find(o=>o.id===actual.id);assert.equal(computed.score,actual.score,actual.name+' score');assert.equal(computed.eligibility,actual.eligibility,actual.name+' eligibility');assert.equal(computed.rank,actual.rank,actual.name+' rank');assert.equal(computed.completeness,actual.completeness,actual.name+' completeness');}
const budget400=domain.previewOffers(data.offers,{...data.preferences,budget:400});
assert.equal(budget400.filter(o=>o.eligibility==='ELIGIBLE').length,0);
assert.equal(budget400.find(o=>o.name==='City Loft 12A').eligibility,'INELIGIBLE');
const missing=data.offers.find(o=>o.transcriptId==='TR-004');assert.equal(missing.weeklyCost,null);assert.equal(missing.completeness,67);
const human=baseline.find(o=>o.transcriptId==='TR-008');assert.equal(human.eligibility,'NEEDS_INFO');assert.equal(human.rank,null);
assert.equal(data.offers.find(o=>o.period==='CALENDAR_MONTH').weeklyCost,420);
const later=domain.previewOffers(data.offers,{...data.preferences,latestMoveIn:'2027-02-25'});assert.equal(later.find(o=>o.transcriptId==='TR-005').eligibility,'ELIGIBLE');
for(const a of data.actions){const fields=[a.id,a.type,a.offerId,a.agency,a.recipient,a.subject,a.body,a.selectedSnapshot];const canonical=['StudentStay-v0-payload-1',...fields.flatMap(x=>[String(x.length),x])].join('|');const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));const digest=Buffer.from(bytes).toString('hex');assert.equal(digest,a.hash,a.id+' exact payload hash');}
console.log('PASS — 9 baseline scores/eligibility/ranks/completeness; lower budget; later availability; unknown bills; human-only exclusion; monthly conversion; 7 approval payload hashes.');
