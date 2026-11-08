import {describe,it,expect} from 'vitest';
import {template} from '../../backend/src/studio/ai';
import {resolveRole,validateLetter,normalizeCompany,validateTechnologies} from '../../backend/src/studio/letter-quality';
describe('letter validation',()=>{
 it.each(['fr','en'])('creates a fallback without placeholders when facts are missing (%s)',language=>{const letter=template(language,'','',{name:'',skills:[],objective:''});expect(letter.body+letter.subject).not.toMatch(/\[.*?\]/);});
 it('normalizes a clear recruitment-team label',()=>{expect(normalizeCompany('Datadog Engineering Recruitment Team')).toBe('Datadog');expect(normalizeCompany('New Company')).toBe('New Company');});
 it('prefers an explicit role',()=>expect(resolveRole('Backend Intern','Re: Designer | Requisition 12345')).toBe('Backend Intern'));
 it('cleans a title when role is absent',()=>expect(resolveRole('','Re: Software Engineering Intern - Madrid | Requisition 12345')).toBe('Software Engineering Intern - Madrid'));
 it('rejects an empty or generic position',()=>{expect(()=>resolveRole('','')).toThrow();expect(()=>resolveRole('','Candidature')).toThrow();});
 it.each(['Dear [company], I would like to apply.','Dear {{name}}, I am interested.','Dear <position>, thank you.'])('rejects incomplete output',body=>expect(()=>validateLetter('Application',body)).toThrow());
 it('rejects an unsupported technology',()=>{expect(()=>validateTechnologies('I used Docker', 'React and TypeScript')).toThrow();expect(()=>validateTechnologies('I used React', 'React and TypeScript')).not.toThrow();});
 it('accepts a complete natural letter',()=>expect(()=>validateLetter('Application','Dear Hiring Manager, I am applying for the role. Thank you for your consideration.')).not.toThrow());
});
