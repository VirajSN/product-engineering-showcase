const {test}=require('node:test'), assert=require('node:assert/strict'), M=require('../loop.ts');
const now=Date.now(), iso=(offset)=>new Date(now+offset).toISOString();
function fixture(ids) {
  const s=M.defaults(), original=s.jobs[0];
  s.jobs=ids.map(id=>({...structuredClone(original), id, company:id, demo:false,
    documents:[{name:'resume.pdf', version:'1', kind:'resume', url:'https://example.com/resume.pdf', reviewed:true}],
    postingCheckedAt:iso(0), materialsChecked:true}));
  s.applications={}; s.pending=null; s.reminders={}; s.snoozed={};
  s.answers=Object.fromEntries(ids.map(id=>[id,{onsite:'Yes',metal:'No',compensation:'80000-100000',compensationCurrency:'USD',compensationPeriod:'Annual'}]));
  return s;
}
const ids=queue=>queue.map(task=>task.job.id);
test('Today orders overdue reminders by deadline, then pending work, and removes duplicates',()=>{
  const s=fixture(['pending','later-due','early-due','prepare']);
  M.startHandoff(s,s.jobs[0]); s.jobs[3].documents=[];
  s.reminders['later-due']=iso(-1000); s.reminders['early-due']=iso(-2000);
  const before=JSON.stringify(s), queue=M.attentionQueue(s,'demo',now);
  assert.deepEqual(ids(queue),['early-due','later-due','pending','prepare']);
  assert.deepEqual(queue.map(t=>t.reason),['reminder','reminder','pending','preparation']);
  assert.equal(new Set(ids(queue)).size,queue.length); assert.equal(JSON.stringify(s),before);
});
test('the recommended task is excluded from the next queue and ready work precedes preparation',()=>{
  const s=fixture(['prepare','ready','also-ready']); s.jobs[0].documents=[];
  const queue=M.attentionQueue(s,'demo',now);
  assert.deepEqual(ids(queue),['ready','also-ready','prepare']);
  assert(!ids(queue.slice(1)).includes(queue[0].job.id));
});
test('snoozing overdue work hides it from both Today sections without changing its deadline',()=>{
  const s=fixture(['due','other']); s.reminders.due=iso(-1000); s.snoozed.due=iso(86400000);
  assert.deepEqual(ids(M.attentionQueue(s,'demo',now)),['other']);
  assert.equal(s.reminders.due,iso(-1000));
  assert.equal(M.attentionQueue(s,'demo',now+86400000)[0].job.id,'due');
});
test('pending handoff remains reachable despite a snooze or changed display mode',()=>{
  const s=fixture(['pending','other']); M.startHandoff(s,s.jobs[0]);
  s.jobs[0].demo=true; s.snoozed.pending=iso(86400000);
  assert.equal(M.attentionQueue(s,'personal',now)[0].job.id,'pending');
});
test('a due pending task appears once and completed records appear only for an eligible reminder',()=>{
  const s=fixture(['pending','submitted','closed']); M.startHandoff(s,s.jobs[0]);
  s.reminders.pending=iso(-2000); s.reminders.submitted=iso(-1000); s.reminders.closed=iso(-3000);
  s.applications.submitted={status:'submitted',evidence:'user_reported'};
  s.applications.closed={status:'closed',evidence:'none'};
  assert.deepEqual(ids(M.attentionQueue(s,'demo',now)),['pending','submitted']);
  delete s.reminders.submitted;
  assert.deepEqual(ids(M.attentionQueue(s,'demo',now)),['pending']);
});
test('invalid reminder/snooze dates do not conceal actionable preparation',()=>{
  const s=fixture(['one']); s.reminders.one='invalid'; s.snoozed.one='invalid';
  assert.deepEqual(ids(M.attentionQueue(s,'demo',now)),['one']);
});
test('filter counts and rendered jobs share mode visibility and every filter',()=>{
  const s=fixture(['real','example']); s.jobs[1].demo=true;
  assert.equal(M.visibleShortlist(s,'demo').length,2);
  assert.deepEqual(M.visibleShortlist(s,'personal').map(j=>j.id),['real']);
  s.filters.query='example'; assert.equal(M.visibleShortlist(s,'demo').length,1);
  assert.equal(M.visibleShortlist(s,'personal').length,0);
  s.filters.query=''; s.filters.savedOnly=true; s.saved.example=true;
  assert.deepEqual(M.visibleShortlist(s,'demo').map(j=>j.id),['example']);
});
test('terminal statuses cannot expose recovery mutations; ordinary paused work can resume',()=>{
  for(const status of ['not_submitted','in_progress','blocked','submitted','interview','closed']) {
    const s=fixture(['one']); s.applications.one={status,evidence:'none'};
    assert.equal(M.canResumeRecovery(s.jobs[0],s),['not_submitted','in_progress','blocked'].includes(status));
  }
});
test('closing removes future attention while retaining documents and recorded evidence',()=>{
  const s=fixture(['one']); M.startHandoff(s,s.jobs[0]); s.reminders.one=iso(-1000);
  const documents=structuredClone(s.jobs[0].documents);
  M.updateRecord(s,'one',{status:'closed'});
  assert.deepEqual(M.attentionQueue(s,'demo',now),[]);
  assert.deepEqual(s.jobs[0].documents,documents); assert.equal(s.applications.one.evidence,'none');
});

