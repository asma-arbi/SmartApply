import {describe,it,expect} from 'vitest';
import {SignJWT} from 'jose';
import {createHash} from 'node:crypto';
import {asmaSession,requireCandidate,principalSchema} from '@smartapply/data';
const secret='fictional-session-secret-for-isolated-tests';
function fixture(){const rows:any={users:[{id:'new-candidate',role:'candidat',name:'New candidate',email:'fixture@example.test'}],sessions:[{id:'s',user_id:'new-candidate',revoked_at:null,expires_at:new Date(Date.now()+86400000).toISOString(),last_active_at:new Date().toISOString(),refresh_token_hash:createHash('sha256').update('fictional-refresh').digest('hex')}]};const connection:any={db:{collection:(name:string)=>({findOne:async(filter:any)=>rows[name].find((row:any)=>Object.entries(filter).every(([key,value])=>row[key]===value))??null})}};return {rows,connection};}
async function access(sub='new-candidate'){return new SignJWT({sid:'s',role:'admin'}).setSubject(sub).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(new TextEncoder().encode(secret));}
describe('Asma module session adapter',()=>{
 it('accepts her existing session without inventing email verification',async()=>{const {connection}=fixture();const p=await asmaSession(connection,'smartapply_access_token='+await access(),secret);expect(p.role).toBe('candidate');expect(p.emailVerified).toBe(false);expect(principalSchema.safeParse(p).success).toBe(true);expect(requireCandidate(p)).toBe('new-candidate');});
 it('uses her existing refresh cookie when access expires',async()=>{const {connection}=fixture();expect((await asmaSession(connection,'smartapply_access_token=expired; smartapply_refresh_token=fictional-refresh',secret)).userId).toBe('new-candidate');});
 it('denies forged credentials',async()=>{await expect(asmaSession(fixture().connection,'smartapply_access_token=forged',secret)).rejects.toMatchObject({status:401});});
 it('binds session owner to signed subject',async()=>{await expect(asmaSession(fixture().connection,'smartapply_access_token='+await access('other'),secret)).rejects.toMatchObject({status:401});});
 it.each(['revoked','expired','inactive','deactivated'])('denies %s sessions/accounts',async state=>{const {connection,rows}=fixture();if(state==='revoked')rows.sessions[0].revoked_at='revoked';if(state==='expired')rows.sessions[0].expires_at=new Date(0).toISOString();if(state==='inactive')rows.sessions[0].last_active_at=new Date(0).toISOString();if(state==='deactivated')rows.users[0].active=false;await expect(asmaSession(connection,'smartapply_access_token='+await access(),secret)).rejects.toMatchObject({status:401});});
 it('checks current database role instead of stale JWT claims',async()=>{const {connection,rows}=fixture();rows.users[0].role='entreprise';const p=await asmaSession(connection,'smartapply_access_token='+await access(),secret);expect(p.role).toBe('recruiter');expect(()=>requireCandidate(p)).toThrow();});
});
