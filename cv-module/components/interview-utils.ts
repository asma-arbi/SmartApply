export type InterviewEntry = {
  id: string; title: string; person: string; company: string; applicationStatus: string;
  scheduledAt: string; durationMinutes: number; mode: string; location: string; note: string;
};
export const modeLabels: Record<string,string> = {VISIO:'Visioconférence',ONSITE:'Présentiel',PHONE:'Téléphone'};
export function tunisDay(value: string | Date) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Tunis',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function interviewState(item: InterviewEntry, now: number) {
  if (['REJECTED','WITHDRAWN'].includes(item.applicationStatus)) return 'cancelled';
  return Date.parse(item.scheduledAt) + item.durationMinutes * 60000 < now ? 'past' : 'scheduled';
}
export function calendarDays(month: string) {
  const [year,m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year,m-1,1));
  const start = new Date(Date.UTC(year,m-1,1-(first.getUTCDay()+6)%7));
  return Array.from({length:42},(_,i)=>new Date(start.getTime()+i*86400000).toISOString().slice(0,10));
}
export function exportInterview(item: InterviewEntry) {
  const escape = (s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/[,;]/g,c=>'\\'+c);
  const stamp=(n:number)=>new Date(n).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const start=Date.parse(item.scheduledAt);
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SmartApply//Entretiens//FR','BEGIN:VEVENT',`UID:${item.id}@smartapply`,`DTSTAMP:${stamp(Date.now())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(start+item.durationMinutes*60000)}`,`SUMMARY:${escape(item.title+' — '+item.person)}`,`LOCATION:${escape(item.location)}`,`DESCRIPTION:${escape(item.note)}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
