import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {GroqAi} from '../backend/src/studio/ai.ts';
import {validateGroundedLetter,finalizeLetterBody} from '../backend/src/studio/letter-quality.ts';
const read=(path:string)=>fs.existsSync(path)?parseEnv(fs.readFileSync(path,'utf8')):{};
const env={...read('backend/.env'),...read('.env'),...process.env};
if(!env.GROQ_API_KEY)throw new Error('GROQ_API_KEY unavailable');
const ai=new GroqAi(env.GROQ_API_KEY,env.GROQ_MODEL||undefined);
const facts={profile:{skills:[{name:'Python'},{name:'MongoDB'},{name:'JavaScript'},{name:'TypeScript'}],projects:[],experience:[]},reviewedCv:'Fictional final-year software engineering student. Built a Python API and a MongoDB data dashboard. Created a JS and TS web interface. Collaborated with classmates to test and document the project. Interested in a software engineering graduation internship.',additionalInformation:'Available from February 2027 for a graduation internship.'};
for(const language of ['fr','en']){
 const target={company:language==='fr'?'Nova Demo':'',role:'Software Engineering Intern',language,tone:'professional',emphasis:facts.additionalInformation,jobDescription:'Contribute to software projects, data APIs, testing and documentation.'};let feedback='',passed=false;
 for(let attempt=0;attempt<2;attempt++){
  const letter=await ai.letter(facts,target,language,attempt>0,feedback);
  try{letter.body=finalizeLetterBody(letter.body,'Demo Candidate');validateGroundedLetter(letter.subject,letter.body,JSON.stringify(facts));if(target.company&&!letter.body.includes(target.company))throw new Error('Missing supplied company');if(!(letter.subject+' '+letter.body).includes('2027'))throw new Error('Missing supplied availability');console.log(JSON.stringify({language,passed:true,words:letter.body.split(/\s+/).length,companyPresent:!target.company||letter.body.includes(target.company),attempts:attempt+1}));passed=true;break;}catch(e:any){feedback=e.message;console.log(JSON.stringify({language,attempt:attempt+1,validation:e.code,placeholders:(letter.subject+' '+letter.body).match(/\[[^\]\n]*\]/g)}));if(attempt===1)throw e;}
 }
 if(!passed)throw new Error('Generation did not pass');
}
