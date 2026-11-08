import {redirect} from 'next/navigation';
import {requireIdentity} from '@/cv-module/lib/identity';
import {ModuleProvider} from '@/cv-module/components/provider';
import '@/cv-module/module.css';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){let p;try{p=await requireIdentity();}catch{redirect('/login?revoked=1');}if(p.role!=='candidate')redirect('/access-denied');return <ModuleProvider>{children}</ModuleProvider>;}
