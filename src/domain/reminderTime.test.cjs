const {test}=require('node:test');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const {reminderBase,changeReminderPart}=require('./reminderTime.ts');
test('saved reminder remains the same instant without applying the current timezone offset',()=>{
 const value='2026-11-10T14:00:00.000Z';
 assert.equal(reminderBase(value).toISOString(),value);
});
test('invalid picker dates never produce a stored timestamp',()=>{
 assert.throws(()=>changeReminderPart(new Date(),new Date('invalid'),'date'),/valid date/);
});
test('date changes across daylight saving preserve local reminder time and normalize its instant',()=>{
 const result=cp.execFileSync(process.execPath,['-r','./scripts/register-typescript.cjs','-e',`
 const assert=require('node:assert/strict');
 const {changeReminderPart,reminderBase,localDateTimeValue}=require('./src/domain/reminderTime.ts');
 const base=new Date('2026-10-06T13:00:00.000Z');
 const selected=new Date(2026,10,10);
 assert.equal(base.getHours(),9);assert.equal(selected.getTimezoneOffset(),300);
 const changed=changeReminderPart(base,selected,'date');
 assert.equal(changed,'2026-11-10T14:00:00.000Z');
 assert.equal(localDateTimeValue(changed),'2026-11-10T09:00');
 assert.equal(changeReminderPart(new Date(changed),new Date(2026,0,1,15,45),'time'),'2026-11-10T20:45:00.000Z');
 const next=reminderBase('',new Date(2026,9,31,16));
 assert.equal(next.getDate(),1);assert.equal(next.getHours(),9);
 console.log('passed');
 `],{env:{...process.env,TZ:'America/New_York'},encoding:'utf8'});
 assert.match(result,/passed/);
});

