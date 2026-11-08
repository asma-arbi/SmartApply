import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import {readFileSync} from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Actor, fixtureIds as f } from './contracts.js';
export type QueryResult<T=Record<string,unknown>>={rows:T[]};
export type Sql={query<T=Record<string,any>>(sql:string,params?:any[]):Promise<QueryResult<T>>};
export class Database implements Sql {
 private local?:PGlite; private pool?:Pool; private tail:Promise<unknown>=Promise.resolve();
 constructor(private directory?:string,private connection?:string){}
 async init(){
  if(this.connection){this.pool=new Pool({connectionString:this.connection,max:4,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:readFileSync(new URL('../certificates/supabase-root-2021.crt',import.meta.url),'utf8')}});await this.pool.query('select 1');return;}
  if(this.directory)await mkdir(this.directory,{recursive:true});
  this.local=new PGlite(this.directory);
  const check=await this.local.query<{exists:boolean}>("select exists(select 1 from pg_tables where schemaname='public' and tablename='candidate_cvs')");
  if(!check.rows[0].exists){await this.local.exec(await readFile(resolve('sql/local-bootstrap.sql'),'utf8'));await this.local.exec(await readFile(resolve('sql/schema.sql'),'utf8'));await this.seed();}
  await this.local.exec(await readFile(resolve('sql/002_studio.sql'),'utf8'));
  await this.local.exec(await readFile(resolve('sql/003_private_letter_snapshots.sql'),'utf8'));
 }
 async query<T=Record<string,any>>(sql:string,params:any[]=[]):Promise<QueryResult<T>> {if(this.pool)return (await this.pool.query(sql,params)) as unknown as QueryResult<T>;return this.local!.query<T>(sql,params);}
 async transaction<T>(actor:Actor,fn:(tx:Sql)=>Promise<T>):Promise<T>{
  if(this.pool){const c=await this.pool.connect();try{await c.query('begin');await c.query('select id from auth.users where id=$1 for update',[actor.id]);const result=await fn(c);await c.query('commit');return result;}catch(e){await c.query('rollback');throw e;}finally{c.release();}}
  const task=this.tail.then(()=>this.local!.transaction(async tx=>{await tx.query('select id from auth.users where id=$1 for update',[actor.id]);return fn(tx as Sql);}));
  this.tail=task.catch(()=>{});return task;
 }
 async close(){await this.pool?.end();await this.local?.close();}
 private async seed(){
  for(const user of [f.candidate,f.otherCandidate,f.recruiter,f.otherRecruiter,f.unverified])await this.query('insert into auth.users(id) values($1)',[user]);
  await this.query("insert into integration_company_refs(id,name,city,technologies,recipient,verified) values($1,'Atlas Code (démo)','Tunis',ARRAY['React','NestJS'],'recrutement@example.test',true),($2,'Sahel Data (démo)','Sousse',ARRAY['Python'],'contact@example.test',true)",[f.company,f.otherCompany]);
  await this.query("insert into integration_job_refs(id,company_id,title,city,contract,state,route,questions) values($1,$2,'Stage PFE — Développement React','Tunis','Stage PFE','published','internal','[{\"id\":\"availability\",\"label\":\"Quand êtes-vous disponible ?\",\"required\":true}]')",[f.job,f.company]);
  await this.query("insert into integration_job_refs(id,company_id,title,city,contract,state,route,source_url) values($1,$3,'Stage Python — source externe (démo)','Sousse','Stage','published','external','https://example.org'),($2,$3,'Offre clôturée (démo)','Sousse','CDI','closed','internal',null)",[f.externalJob,f.closedJob,f.otherCompany]);
  await this.query('insert into integration_membership_refs(user_id,company_id,verified) values($1,$4,true),($2,$5,true),($3,$4,false)',[f.recruiter,f.otherRecruiter,f.unverified,f.company,f.otherCompany]);
 }
}
