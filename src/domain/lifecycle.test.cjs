const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../loop.ts');
const L=require('./lifecycle.ts');
function ready(){const s=M.defaults(),j=s.jobs[0];j.demo=false;j.postingCheckedAt='2026-10-05';j.documents=[{id:'resume',name:'resume.pdf',version:'1',kind:'resume',localUri:'file://resume.pdf',reviewed:true}];s.answers[j.id]={onsite:'Yes',metal:'No',compensation:'25',compensationCurrency:'USD',compensationPeriod:'Hourly'};j.materialsChecked=true;return {s,j};}
test('saving → verified folder → opened never establishes submission',()=>{const {s,j}=ready();assert.equal(L.lifecycle(j,s),'ready');M.startHandoff(s,j);assert.equal(L.lifecycle(j,s),'handoff_saving');assert.throws(()=>L.advanceHandoff(s,j.id,'opened'),/Invalid/);assert.throws(()=>L.advanceHandoff(s,j.id,'saved'),/folder/);L.advanceHandoff(s,j.id,'saved','content://verified');L.advanceHandoff(s,j.id,'opened');assert.equal(L.lifecycle(j,s),'employer_opened');assert.equal(M.application(j,s).status,'not_submitted');M.outcome(s,j.id,'submitted');assert.equal(L.lifecycle(j,s),'submitted');});
test('interrupted handoff restores recovery and exact historical documents',()=>{const {s,j}=ready();M.startHandoff(s,j);L.advanceHandoff(s,j.id,'failed');M.changeDocument(s,j.id,'resume',{version:'2'});const restored=M.load(JSON.stringify(s));assert.equal(L.lifecycle(restored.jobs[0],restored),'blocked');assert.equal(restored.pending.documents[0].version,'1');assert.throws(()=>M.outcome(restored,j.id,'submitted'),/not opened/);});
test('submitted/interview/closed cannot regress into preparation',()=>{for(const status of ['submitted','interview','closed']){const {s,j}=ready();s.applications[j.id]={status,evidence:'user_reported'};assert.throws(()=>M.updateRecord(s,j.id,{status:'in_progress'}),/transition/);assert.equal(s.applications[j.id].status,status);}});
test('submitted evidence survives refreshed import and later edits',()=>{const {s,j}=ready();M.startHandoff(s,j);L.advanceHandoff(s,j.id,'saved','content://verified');L.advanceHandoff(s,j.id,'opened');M.outcome(s,j.id,'submitted');M.importFeed(s,{schema:1,jobs:[{...j,documents:[]}]});M.setAnswer(s,j.id,'metal','Yes');assert.equal(s.applications[j.id].status,'submitted');assert.equal(s.applications[j.id].kit.answers.metal,'No');assert.equal(s.applications[j.id].kit.documents[0].version,'1');});
test('legacy timeline text stays readable while new events carry metadata',()=>{const s=M.defaults();M.event(s,null,'Local operation');const event=s.events[0];assert.equal(event.entityType,'workspace');assert.equal(event.actor,'user');assert.equal(event.payload.message,event.text);assert.deepEqual(M.load(JSON.stringify(s)).events,s.events);});

test('manual and opened outcomes must be resolved before restarting the same handoff',()=>{
  for(const phase of ['manual','opened']){
    const {s,j}=ready();
    if(phase==='manual') M.manualOutcome(s,j);
    else {M.startHandoff(s,j);L.advanceHandoff(s,j.id,'saved','content://verified');L.advanceHandoff(s,j.id,'opened');}
    const pending=JSON.stringify(s.pending);
    assert.equal(M.ready(j,s),false);
    assert.throws(()=>M.startHandoff(s,j),/pending outcome/);
    assert.equal(JSON.stringify(s.pending),pending);
    assert.equal(M.application(j,s).evidence,'none');
    M.outcome(s,j.id,'later');
    assert.equal(M.ready(j,s),true);
    M.startHandoff(s,j);
    assert.equal(s.pending.phase,'saving');
  }
});

test('failed handoff remains eligible for an explicit retry with a fresh snapshot',()=>{
  const {s,j}=ready();M.startHandoff(s,j);L.advanceHandoff(s,j.id,'failed');
  const original=s.pending;
  assert.equal(M.ready(j,s),true);
  M.startHandoff(s,j);
  assert.equal(s.pending.phase,'saving');
  assert.notEqual(s.pending,original);
  assert.equal(original.phase,'failed');
  assert.equal(M.application(j,s).evidence,'none');
});

