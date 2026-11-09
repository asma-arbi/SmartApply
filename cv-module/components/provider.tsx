"use client";
import {Toaster} from 'sonner';
export function ModuleProvider({children}:{children:React.ReactNode}){return <div className="cv-module">{children}<Toaster richColors closeButton position="bottom-right"/></div>;}
