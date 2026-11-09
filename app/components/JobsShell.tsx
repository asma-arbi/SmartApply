import {getSessionUser} from '@/lib/auth/session';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
export default async function JobsShell({children}:{children:React.ReactNode}){const session=await getSessionUser();if(session?.user.role!=='candidat')return <>{children}</>;const u=session.user;return <div className="flex h-screen overflow-hidden bg-slate-50"><Sidebar role="candidat" userName={u.name||'Candidat'} userEmail={u.email||''}/><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><TopBar role="candidat" userName={u.name||'Candidat'} userEmail={u.email||''}/><main className="flex-1 overflow-auto">{children}</main></div></div>}
