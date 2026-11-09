import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {calendarDays,exportInterview,interviewState,tunisDay,type InterviewEntry} from '../components/interview-utils';
const item: InterviewEntry = {id:'123',title:'Lead, R&D',person:'Alice; Dupont',company:'ACME',applicationStatus:'INTERVIEW',scheduledAt:'2026-01-01T23:30:00Z',durationMinutes:60,mode:'VISIO',location:'https://example.test/a,b',note:'Line one\nLine two'};
test('Tunis day crosses UTC year boundary',()=>assert.equal(tunisDay(item.scheduledAt),'2026-01-02'));
test('calendar is a Monday-first six-week grid through leap day',()=>{const days=calendarDays('2024-02');assert.equal(days.length,42);assert.equal(days[0],'2024-01-29');assert(days.includes('2024-02-29'));assert.equal(days[41],'2024-03-10');});
test('status considers end time and cancellation',()=>{assert.equal(interviewState(item,Date.parse('2026-01-02T00:00:00Z')),'scheduled');assert.equal(interviewState(item,Date.parse('2026-01-02T00:31:00Z')),'past');assert.equal(interviewState({...item,applicationStatus:'WITHDRAWN'},0),'cancelled');});
test('iCal uses UTC, duration, escaping and CRLF',()=>{const ics=exportInterview(item);assert.match(ics,/DTSTART:20260101T233000Z\r\nDTEND:20260102T003000Z/);assert(ics.includes('SUMMARY:Lead\\, R&D — Alice\\; Dupont'));assert(ics.includes('DESCRIPTION:Line one\\nLine two'));assert(ics.endsWith('END:VCALENDAR\r\n'));});
