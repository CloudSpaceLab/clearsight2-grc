import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
export function RecordDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null)
  const titleId=useId()
  useEffect(()=>{const opener=document.activeElement;ref.current?.showModal();return()=>{if(opener instanceof HTMLElement&&opener.isConnected)opener.focus()}},[])
  return <dialog ref={ref} className="v1-record-dialog" aria-labelledby={titleId} onCancel={onClose}><div className="program-dialog-header"><span>Program record</span><button type="button" className="program-dialog-close" onClick={onClose} aria-label="Close record">×</button></div><h2 id={titleId}>{title}</h2>{children}</dialog>
}
