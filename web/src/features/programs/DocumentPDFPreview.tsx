import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export function DocumentPDFPreview({ url, title }: { url: string; title: string }) {
 const canvas = useRef<HTMLCanvasElement>(null)
 const [document, setDocument] = useState<PDFDocumentProxy>()
 const [page, setPage] = useState(1)
 const [error, setError] = useState('')
 const [loading, setLoading] = useState(true)
 const [text, setText] = useState('')
 useEffect(() => {
  let active = true
  let cleanup: (()=>void) | undefined
  setError(''); setLoading(true)
  void import('pdfjs-dist').then(async pdf => {
   if (!active) return
   pdf.GlobalWorkerOptions.workerSrc = workerURL
   const task = pdf.getDocument({ url })
   cleanup = () => { void task.destroy() }
   const loaded = await task.promise
   if (active) setDocument(loaded)
  }).catch(e => { if (active) { setError(e instanceof Error ? e.message : 'PDF could not be displayed.'); setLoading(false) } })
  return () => { active = false; cleanup?.() }
 }, [url])
 useEffect(() => {
  if (!document || !canvas.current) return
  let active = true
  let cancel: (()=>void) | undefined
  setLoading(true); setError('')
  void document.getPage(page).then(async pdfPage => {
   if (!active || !canvas.current) return
   const viewport = pdfPage.getViewport({ scale: 1.25 })
   const surface = canvas.current
   surface.width = viewport.width; surface.height = viewport.height
   const task = pdfPage.render({ canvas: surface, viewport })
   cancel = () => task.cancel()
   await task.promise
   const content = await pdfPage.getTextContent()
   if (active) setText(content.items.map(item => 'str' in item ? item.str : '').join(' '))
  }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'PDF page could not be displayed.') })
   .finally(() => { if (active) setLoading(false) })
  return () => { active = false; cancel?.() }
 }, [document, page])
 return <div className="document-pdf-preview">
  {loading && <p role="status">Rendering PDF...</p>}
  {error && <p role="alert">Preview unavailable. Download the original file. {error}</p>}
  <canvas ref={canvas} aria-label={title + ', page ' + page} role="img" style={{width:'100%',height:'auto'}}/>
  {document && <div className="program-dialog-actions">
   <button type="button" className="button" disabled={page===1||loading} onClick={()=>setPage(value=>value-1)}>Previous page</button>
   <span>Page {page} of {document.numPages}</span>
   <button type="button" className="button" disabled={page===document.numPages||loading} onClick={()=>setPage(value=>value+1)}>Next page</button>
  </div>}
  {text && <details><summary>Page text</summary><p>{text}</p></details>}
 </div>
}
