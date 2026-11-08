export function configuration(env:NodeJS.ProcessEnv=process.env){
 const local=env.APP_MODE==='local';
 if(local&&env.NODE_ENV==='production')throw new Error('APP_MODE=local est interdit en production.');
 const required=local?[]:['DATABASE_URL','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'];
 const missing=required.filter(k=>!env[k]?.trim()||env[k]?.startsWith('YOUR_'));
 if(missing.length)throw new Error(`Configuration manquante dans backend/.env : ${missing.join(', ')}. Aucun remplacement local automatique.`);
 if(!local){const url=new URL(env.SUPABASE_URL!);if(url.protocol!=='https:')throw new Error('SUPABASE_URL doit utiliser HTTPS.');if(!/^postgres(?:ql)?:/.test(env.DATABASE_URL!))throw new Error('DATABASE_URL doit être une connexion PostgreSQL.');}
 return {local,port:Number(env.PORT??4100),groqConfigured:!!env.GROQ_API_KEY?.trim()};
}
