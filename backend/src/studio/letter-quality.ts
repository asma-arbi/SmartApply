import {DataError} from '@smartapply/data';
export function resolveRole(role:string,title:string){const result=(role||title).replace(/^\s*(?:re|fw|fwd)\s*:\s*/i,'').replace(/\s*(?:\||[-–])\s*(?:requisition|req(?:uisition)?\.?|référence|ref\.?)\s*#?\s*[\w-]+.*$/i,'').trim();if(result.length<3||/^(?:candidature|application|cover letter|lettre de motivation)$/i.test(result))throw new DataError('ROLE_REQUIRED','Indiquez le poste visé ou un titre de candidature clair.',422);return result;}
export function validateLetter(subject:string,body:string){if(/\[[^\]\n]{1,100}\]|\{\{[^}]+\}\}|<(?:position|company|name)>/i.test(subject+' '+body))throw new DataError('AI_INVALID_RESPONSE','La lettre contient des champs incomplets. Réessayez : votre brouillon est conservé.',502);}

export function normalizeCompany(value:string){const trimmed=value.trim();const match=/^([\w.-]+)\s+engineering recruitment team$/i.exec(trimmed);return match?match[1]:trimmed;}

// Conservative checks for common technologies; unknown concepts still require human review.
export function validateTechnologies(body:string,evidence:string){for(const expression of [/\bDocker\b/i,/\bKubernetes\b/i,/\bPython\b/i,/\bJavaScript\b/i,/\bTypeScript\b/i,/\bReact(?:\.js|JS)?\b/i,/\bMongoDB\b/i,/\bAWS\b/i,/\bAzure\b/i,/\bTensorFlow\b/i,/\bPyTorch\b/i])if(expression.test(body)&&!expression.test(evidence))throw new DataError('AI_UNGROUNDED','La lettre mentionne une technologie absente des informations confirmées. Réessayez : votre brouillon est conservé.',502);}
