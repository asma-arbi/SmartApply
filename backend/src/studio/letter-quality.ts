import {DataError} from '@smartapply/data';
export function resolveRole(role:string,title:string){const result=(role||title).replace(/^\s*(?:re|fw|fwd)\s*:\s*/i,'').replace(/\s*(?:\||[-–])\s*(?:requisition|req(?:uisition)?\.?|référence|ref\.?)\s*#?\s*[\w-]+.*$/i,'').trim();if(result.length<3||/^(?:candidature|application|cover letter|lettre de motivation)$/i.test(result))throw new DataError('ROLE_REQUIRED','Indiquez le poste visé ou un titre de candidature clair.',422);return result;}
export function validateLetter(subject:string,body:string){if(/\[[^\]\n]{1,100}\]|\{\{[^}]+\}\}|<(?:position|company|name)>/i.test(subject+' '+body))throw new DataError('AI_INVALID_RESPONSE','La lettre contient des champs incomplets. Réessayez : votre brouillon est conservé.',502);}

export function normalizeCompany(value:string){const trimmed=value.trim();const match=/^([\w.-]+)\s+engineering recruitment team$/i.exec(trimmed);return match?match[1]:trimmed;}

// Match equivalent CV spellings without treating job requirements as candidate evidence.
const technologies:ReadonlyArray<readonly [string,RegExp]>=[
 ['Docker',/\bdocker\b/i],['Kubernetes',/\b(?:kubernetes|k8s)\b/i],['Python',/\bpython\b/i],
 ['JavaScript',/\b(?:javascript|java[ -]script|js)\b/i],['TypeScript',/\b(?:typescript|type[ -]script|ts)\b/i],
 ['React',/\breact(?:[ .-]?js|[ .-]?native)?\b/i],['Angular',/\bangular(?:js)?\b/i],['Vue',/\bvue(?:\.js|js)\b|\bVue\b/],
 ['Node.js',/\bnode(?:\.js|js| js)\b/i],['Next.js',/\bnext(?:\.js|js| js)\b/i],
 ['MongoDB',/\bmongo(?:db)?\b/i],['PostgreSQL',/\b(?:postgresql|postgres)\b/i],['MySQL',/\bmysql\b/i],
 ['Java',/\bjava\b(?![ -]?script)/i],['Spring Boot',/\bspring[ -]?boot\b/i],['PHP',/\bphp\b/i],
 ['Flutter',/\bflutter\b/i],['Dart',/\bdart\b/i],['Swift',/\bswift\b/i],['Kotlin',/\bkotlin\b/i],
 ['AWS',/\b(?:aws|amazon web services)\b/i],['Azure',/\bazure\b/i],['Google Cloud',/\b(?:gcp|google cloud)\b/i],
 ['TensorFlow',/\btensor[ -]?flow\b/i],['PyTorch',/\bpytorch\b/i],
 ['C#',/(?:^|[^\w])c(?:#| sharp)(?=$|[^\w])/i],['C++',/(?:^|[^\w])c\+\+(?=$|[^\w])/i],['.NET',/\b(?:asp\.net|dotnet)\b|(?:^|[^\w])\.net\b/i]
];
export function supportedTechnologies(evidence:string){return technologies.filter(([,pattern])=>pattern.test(evidence.normalize('NFKC'))).map(([name])=>name);}
export function unsupportedTechnologies(body:string,evidence:string){return technologies.filter(([,pattern])=>pattern.test(body.normalize('NFKC'))&&!pattern.test(evidence.normalize('NFKC'))).map(([name])=>name);}
export function validateTechnologies(body:string,evidence:string){const missing=unsupportedTechnologies(body,evidence);if(missing.length)throw new DataError('AI_UNGROUNDED',`Technologies non confirmées : ${missing.join(', ')}. Réessayez : votre brouillon est conservé.`,502);}
export function validateGroundedLetter(subject:string,body:string,evidence:string){
 validateLetter(subject,body);validateTechnologies(subject+' ' +body,evidence);
 const numbers=(text:string)=>text.match(/\b\d+(?:[.,]\d+)?\b/g)??[];
 const allowed=new Set(numbers(evidence));
 if(numbers(subject+' ' +body).some(number=>!allowed.has(number)))throw new DataError('AI_UNGROUNDED','La lettre contient un chiffre non confirmé. Supprimez les métriques ou dates absentes des informations fournies.',502);
}

/** Only known name placeholders are resolved locally; other unfinished fields still fail validation. */
export function finalizeLetterBody(body:string,name=''){
 const localName=name.trim();
 return body.replace(/\[CANDIDAT\]/gi,()=>localName).replace(/^[ \t]*\[(?:your name|votre nom|candidate name|nom du candidat)\][ \t]*$/gim,()=>localName).trim();
}
