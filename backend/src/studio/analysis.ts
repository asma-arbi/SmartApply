import {randomUUID} from 'node:crypto';
import {DomainError,normalizeSkill} from '../contracts.js';
import {extractionSchema,Extraction} from './contracts.js';
export async function extractText(bytes:Buffer,mime:string){
 if(mime.includes('wordprocessingml'))return (await import('@smartapply/data')).docxText(bytes);
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true});
 try{const pdf=await task.promise;if(pdf.numPages>30)throw new DomainError('CV_TOO_LONG','Limitez le document à 30 pages pour l’analyse.');const pages=[];for(let i=1;i<=pdf.numPages;i++){const content=await(await pdf.getPage(i)).getTextContent();pages.push(content.items.map((v:any)=>`${v.str??''}${v.hasEOL?'\n':' '}`).join(''));}return pages.join('\n');}finally{await task.destroy();}
}
export function redact(text:string,name=''){
 let result=text.normalize('NFKC').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[EMAIL]').replace(/(?:https?:\/\/|www\.)\S+/gi,'[LIEN]').replace(/(?:\+?\d[\d .()\-]{7,}\d)/g,'[TÉLÉPHONE]');
 if(name.trim())result=result.replace(new RegExp(name.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'[CANDIDAT]');
 result=result.split('\n').map((line,i)=>i<3&&/^\s*[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,3}\s*$/u.test(line)&&!/(experience|education|formation|competence|curriculum|professional|project)/i.test(line)?'[CANDIDAT]':line).join('\n');
 return result.trim().slice(0,24000);
}
const norm=(v:string)=>v.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
export function groundedExtraction(value:unknown,text:string,target:string):Extraction{
 const parsed=extractionSchema.safeParse(value);if(!parsed.success)throw new DomainError('AI_INVALID_RESPONSE','La réponse IA est incomplète. Vos données sont conservées.',502);
 const result=parsed.data;const present=(e:{evidence:string},inText:string)=>!!e.evidence.trim()&&norm(inText).includes(norm(e.evidence));
 for(const section of ['education','experience','projects'] as const)result[section]=result[section].filter(e=>present(e,text)&&norm(text).includes(norm(e.title))&&(!e.organization||norm(text).includes(norm(e.organization)))).map(e=>({...e,description:e.evidence,start:e.start&&text.includes(e.start)?e.start:null,end:e.end&&text.includes(e.end)?e.end:null,url:e.url&&text.includes(e.url)?e.url:null,technologies:e.technologies.filter(t=>norm(text).includes(norm(t)))}));
 result.skills=result.skills.filter(e=>present(e,text));if(result.objective&&!norm(text).includes(norm(result.objective)))result.objective='';
 const named=(e:{name:string;evidence:string})=>normalizeSkill(e.evidence).includes(normalizeSkill(e.name));
 result.skills=result.skills.filter(named);result.requiredSkills=result.requiredSkills.filter(e=>present(e,target)&&named(e));return result;
}
export function extractedProfile(e:Extraction){
 const entry=(v:Extraction['education'][number])=>({id:randomUUID(),title:v.title.slice(0,200),organization:v.organization.slice(0,200),description:v.description.slice(0,5000),start:v.start&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v.start)?v.start:undefined,end:v.end&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v.end)?v.end:undefined,current:v.current,url:v.url&&/^https?:\/\//i.test(v.url)?v.url:'',technologies:v.technologies.slice(0,40),source:'extraction'});
 const seen=new Set<string>();return {objective:e.objective.slice(0,300),education:e.education.slice(0,40).map(entry),experience:e.experience.slice(0,40).map(entry),projects:e.projects.slice(0,40).map(entry),skills:e.skills.filter(s=>{const k=normalizeSkill(s.name);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,150).map(s=>({id:randomUUID(),name:s.name.slice(0,80),category:s.category.slice(0,80),proficiency:s.proficiency.slice(0,50),source:'extraction'}))};
}
export function scoreCv(text:string,p:ReturnType<typeof extractedProfile>,e:Extraction){
 const content=[!!p.objective,p.skills.length>0,p.education.length>0,p.experience.length+p.projects.length>0].filter(Boolean).length*10;
 const headings=[/(competences?|skills?)/i,/(formations?|education)/i,/(experience|employment|parcours)/i,/(projets?|projects?)/i];
 const structure=headings.filter(re=>re.test(text.normalize('NFD').replace(/[\u0300-\u036f]/g,''))).length*5;
 const items=[...p.experience,...p.projects];const ratio=(fn:(v:typeof items[number])=>boolean)=>items.length?items.filter(fn).length/items.length:0;
 const evidence=Math.round(5*(ratio(v=>v.description.trim().length>=40)+ratio(v=>!!v.start)+ratio(v=>v.technologies.length>0)+ratio(v=>!!v.organization)));
 const lines=text.split(/\n/).filter(v=>v.trim());const average=lines.reduce((n,v)=>n+v.length,0)/Math.max(lines.length,1);
 const readability=(text.length>=200&&text.length<=16000?10:0)+(lines.length>=4?5:0)+(average<=180?5:0);
 const byName=new Map(e.requiredSkills.map(s=>[normalizeSkill(s.name),s]));const candidate=new Set(p.skills.map(s=>normalizeSkill(s.name)));
 const required=[...byName.values()].map(s=>({...s,matched:candidate.has(normalizeSkill(s.name))}));
 return {rubricVersion:'cv-quality-v1',quality:content+structure+evidence+readability,parts:[{name:'Contenu',score:content,max:40,reason:'Objectif, compétences, formation et expérience ou projet : 10 points chacun.'},{name:'Structure',score:structure,max:20,reason:'Quatre rubriques identifiables, 5 points chacune.'},{name:'Preuves',score:evidence,max:20,reason:'Descriptions détaillées, dates de début, technologies et organisations des expériences/projets.'},{name:'Lisibilité',score:readability,max:20,reason:'Texte de 200 à 16 000 caractères : 10 points ; au moins 4 lignes : 5 ; lignes de 180 caractères en moyenne au plus : 5.'}],relevance:required.length?Math.round(required.filter(s=>s.matched).length/required.length*100):null,required,matched:required.filter(s=>s.matched).map(s=>s.name),missing:required.filter(s=>!s.matched).map(s=>s.name)};
}
