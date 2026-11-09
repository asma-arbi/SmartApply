import {createHash} from 'node:crypto';
import {Actor,DomainError,parse,id,requireCandidate} from '../contracts.js';
import {Database,Sql} from '../database.js';
export class StudioRepository{
 constructor(public db:Database){}
 async owned(table:'candidate_letters'|'candidate_ai_jobs',recordId:string,a:Actor,tx:Sql=this.db){requireCandidate(a);parse(id,recordId);const row=(await tx.query(`select * from ${table} where id=$1${tx===this.db?'':' for update'}`,[recordId])).rows[0];if(!row)throw new DomainError('NOT_FOUND','Élément introuvable.',404);if(row.user_id!==a.id)throw new DomainError('FORBIDDEN','Cet élément appartient à un autre compte.',403);return row;}
 async operation(a:Actor,key:string,kind:string,input:unknown,work:(tx:Sql)=>Promise<any>){requireCandidate(a);if(!/^[a-zA-Z0-9-]{8,100}$/.test(key))throw new DomainError('IDEMPOTENCY_REQUIRED','Une clé d’opération valide est requise.');const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');return this.db.transaction(a,async tx=>{const prior=(await tx.query('select * from module_operations where user_id=$1 and key=$2',[a.id,key])).rows[0];if(prior){if(prior.operation!==kind||prior.fingerprint!==fingerprint)throw new DomainError('IDEMPOTENCY_CONFLICT','Cette clé appartient à une autre demande.',409);return prior.result;}const result=await work(tx);await tx.query('insert into module_operations(user_id,key,operation,fingerprint,result) values($1,$2,$3,$4,$5)',[a.id,key,kind,fingerprint,JSON.stringify(result)]);return result;});}
}
