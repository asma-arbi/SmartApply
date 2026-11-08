import { Interview } from '../types/interview';

function formatIcsDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function generateIcsContent(interview: Interview): string {
  const start = formatIcsDate(interview.scheduledStart);
  const end = formatIcsDate(interview.scheduledEnd);
  const now = formatIcsDate(new Date().toISOString());

  const summary = `Entretien SmartApply: ${interview.candidateName} - ${interview.companyName}`;
  const location = interview.mode === 'VIDEO' ? (interview.meetingUrl || 'Visioconférence') : (interview.locationText || 'Tunisie');
  const description = `Entretien pour le poste de ${interview.candidateTitle}\\nEntreprise: ${interview.companyName}\\nCandidat: ${interview.candidateName} (${interview.candidateEmail})\\nMode: ${interview.mode}\\nLien/Lieu: ${location}`;

  const statusMap: Record<string, string> = {
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    PROPOSED: 'TENTATIVE',
    RESCHEDULE_REQUESTED: 'TENTATIVE',
    COMPLETED: 'CONFIRMED',
    DECLINED: 'CANCELLED',
    NO_SHOW: 'CANCELLED'
  };
  const icsStatus = statusMap[interview.status] || 'CONFIRMED';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartApply Tunisia//Module Entretiens//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${interview.id}@smartapply.tn`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:${icsStatus}`,
    `SEQUENCE:${interview.rescheduleCount || 0}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Rappel: Entretien ${interview.companyName} dans 30 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadIcsFile(interview: Interview): void {
  const content = generateIcsContent(interview);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `entretien-${interview.companyName.toLowerCase().replace(/\s+/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
