'use client';
import { useEffect,useRef } from 'react';
import { X,WarningCircle,CheckCircle,FilePdf,FileDoc } from '@phosphor-icons/react';
import { Cv } from './api';
export function Notice({children,error=false}:{children:React.ReactNode;error?:boolean}){return <div className={`notice ${error?'error':''}`} role={error?'alert':'status'}><WarningCircle size={20}/><div>{children}</div></div>;}
export function Dialog({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLElement|null>(null);useEffect(()=>{if(!trigger.current)trigger.current=document.activeElement as HTMLElement;ref.current?.showModal();const d=ref.current;return()=>{d?.close();queueMicrotask(()=>trigger.current?.focus());};},[]);return <dialog ref={ref} onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="dialog-heading"><div className="dialog-head"><h2 id="dialog-heading">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fermer la fenêtre"><X size={22}/></button></div>{children}</dialog>;}
export function FileMark({cv}:{cv:Pick<Cv,'mime_type'>}){return <span className={`file-mark ${cv.mime_type==='application/pdf'?'pdf':'word'}`}>{cv.mime_type==='application/pdf'?<FilePdf size={27} weight="fill"/>:<FileDoc size={27} weight="fill"/>}</span>;}
export function Empty({title,children}:{title:string;children:React.ReactNode}){return <div className="empty"><div className="empty-icon"><CheckCircle size={32}/></div><h3>{title}</h3>{children}</div>;}
export function Skeleton(){return <div className="skeletons" aria-busy="true" aria-label="Chargement des données"><div/><div/><div/></div>;}
