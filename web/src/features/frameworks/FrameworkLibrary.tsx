import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../shared/Icons'

type Region = 'NG' | 'KE' | 'ZA' | 'GH' | 'EU'
type Framework = {
  id:string;title:string;edition:string;jurisdiction:Region;sectors:string[];
  issuer:string;source_url:string;source_status:'source_identified'|'verification_pending';
  content_status:'metadata_only';license:'link_only';requirements:string[]
}
type Catalog = {seed_revision:string;total:number;items:Framework[]}
const regions:Record<Region,string> = {
  NG:'Nigeria',KE:'Kenya',ZA:'South Africa',GH:'Ghana',EU:'European Union'
}
const sectors:Record<string,string> = {
  banking:'Banking',fintech:'Fintech',privacy:'Privacy',telecom:'Telecommunications',
  'oil-gas':'Oil & gas','cross-sector':'Cross-sector'
}
function validCatalog(raw:unknown):raw is Catalog {
  if(!raw || typeof raw!=='object')return false
  const c=raw as Partial<Catalog>
  return typeof c.seed_revision==='string' && typeof c.total==='number' &&
    Array.isArray(c.items) && c.items.every(f=>f!=null &&
      typeof f.id==='string' && typeof f.title==='string' &&
      typeof f.edition==='string' && typeof f.issuer==='string' &&
      typeof f.source_url==='string' && f.jurisdiction in regions &&
      Array.isArray(f.sectors) && (f.source_status==='source_identified'||f.source_status==='verification_pending') &&
      f.content_status==='metadata_only' && f.license==='link_only' &&
      Array.isArray(f.requirements) && f.requirements.length===0)
}
function sourceUrl(raw:string):string|null {
  try {const url=new URL(raw);return url.protocol==='https:'?url.href:null}
  catch{return null}
}
export function FrameworkLibrary(){
  const [catalog,setCatalog]=useState<Catalog|null>(null)
  const [loading,setLoading]=useState<'loading'|'ready'|'error'>('loading')
  const [retry,setRetry]=useState(0)
  const [query,setQuery]=useState('')
  const [jurisdiction,setJurisdiction]=useState('')
  const [industry,setIndustry]=useState('')
  const [selectedId,setSelectedId]=useState<string|null>(null)
  useEffect(()=>{
    const controller=new AbortController()
    setLoading('loading')
    fetch('/api/v1/frameworks',{signal:controller.signal,headers:{Accept:'application/json'}})
      .then(async r=>{if(!r.ok)throw Error('Catalog request failed')
        const body:unknown=await r.json()
        if(!validCatalog(body))throw Error('Invalid catalog response')
        return body
      })
      .then(data=>{if(!controller.signal.aborted){setCatalog(data);setLoading('ready')}})
      .catch(()=>{if(!controller.signal.aborted){setCatalog(null);setLoading('error')}})
    return ()=>controller.abort()
  },[retry])
  const visible=useMemo(()=>{
    const term=query.trim().toLowerCase()
    return (catalog?.items??[]).filter(f=>
      (!jurisdiction||f.jurisdiction===jurisdiction)&&
      (!industry||f.sectors.includes(industry))&&
      (!term||[f.title,f.id,f.issuer,f.edition,regions[f.jurisdiction],...f.sectors]
        .some(part=>part.toLowerCase().includes(term)))
    ).sort((a,b)=>a.title.localeCompare(b.title))
  },[catalog,query,jurisdiction,industry])
  const selected=visible.find(f=>f.id===selectedId)??visible[0]??null
  const clear=()=>{setQuery('');setJurisdiction('');setIndustry('')}
  return <>

          <section className="page-heading">
            <div className="decor" aria-hidden="true"><svg viewBox="0 0 760 130" preserveAspectRatio="none">
              <path d="M0 122 C150 96 190 126 300 60 C370 14 430 112 530 64 C635 13 655 39 760 75 L760 130 L0 130Z" fill="#a8dcff" opacity=".17"/>
              <path d="M0 128 C135 111 218 120 336 75 C447 28 470 105 565 62 C640 25 690 49 760 22 L760 130 L0 130Z" fill="#75bffe" opacity=".12"/>
            </svg></div>
            <div className="heading-copy"><div className="eyebrow">Compliance / Reference library</div>
              <h1>Framework Library</h1><p>Review an edition before adding it to a Program.</p></div>
            <div className="heading-actions">
              <span className="subtle-badge"><Icon name="info"/>Metadata only</span>
              <button className="button ghost" disabled type="button" title="Requires regulated source management"><Icon name="setting"/>Manage regulators</button>
              <button className="button primary" disabled type="button" title="Requires reviewed source and authorization"><Icon name="plus"/>Add framework</button>
            </div>
          </section>
          <div className="tabs" role="tablist" aria-label="Library views">
            <button className="tab selected" type="button" role="tab" aria-selected="true">Explore</button>
            <button className="tab" type="button" role="tab" aria-selected="false" disabled>In my Programs</button>
            <button className="tab" type="button" role="tab" aria-selected="false" disabled>Edition updates</button>
          </div>
          <div className="searchbar">
            <label className="searchbox"><Icon name="search"/><input type="search"
              aria-label="Search framework references" placeholder="Search standards, regulators, or requirements"
              value={query} onChange={e=>setQuery(e.currentTarget.value)}/></label>
            <label className="dropdown"><Icon name="globe"/><select value={jurisdiction} aria-label="Jurisdiction"
              onChange={e=>setJurisdiction(e.currentTarget.value)}>
              <option value="">All jurisdictions</option>
              {Object.entries(regions).map(([id,name])=><option key={id} value={id}>{name}</option>)}
            </select><Icon name="chevron"/></label>
            <label className="dropdown"><Icon name="filter"/><select value={industry} aria-label="Industry"
              onChange={e=>setIndustry(e.currentTarget.value)}>
              <option value="">All industries</option>
              {Object.entries(sectors).map(([id,name])=><option key={id} value={id}>{name}</option>)}
            </select><Icon name="chevron"/></label>
            <button type="button" className="clear" onClick={clear} disabled={!query&&!jurisdiction&&!industry}>Clear filters</button>
          </div>
          <div className="workspace">
            <section className="results" aria-label="Framework reference list">
              <div className="results-head"><h2>Reference editions <span>· {loading==='ready'?visible.length:'—'} entries</span></h2>
                <span>Edition and content rights shown for every entry</span></div>
              <div className="results-list">
                {loading==='loading'?<div className="inline-state" role="status">Loading references…</div>
                :loading==='error'?<div className="inline-state" role="alert"><h3>Catalog unavailable</h3>
                    <p>Could not load the catalog. No example values have been substituted.</p>
                    <button type="button" className="button" onClick={()=>setRetry(i=>i+1)}>Retry</button></div>
                :visible.length===0?<div className="inline-state"><h3>No matching editions</h3>
                    <p>Change the search, jurisdiction or industry.</p>
                    <button className="button" type="button" onClick={clear}>Clear filters</button></div>
                :visible.map(f=><button className={'framework-row'+(selected?.id===f.id?' selected':'')}
                    type="button" key={f.id} aria-pressed={selected?.id===f.id} onClick={()=>setSelectedId(f.id)}>
                  <span className="fw-logo">{f.jurisdiction}</span>
                  <span><span className="fw-title">{f.title}</span><span className="fw-desc">{f.issuer}</span>
                    <span className="fw-tags"><span className="tag">{regions[f.jurisdiction]}</span>
                      <span className="tag"><b>·</b></span>
                      <span className="tag">{sectors[f.sectors[0] ?? '']??'Reference'}</span></span></span>
                  <span className="edition"><strong>{f.issuer}</strong><small>Edition {f.edition}</small></span>
                  <span className="fw-status"><span className={'pill '+(f.source_status==='source_identified'?'blue':'gold')}>
                    {f.source_status==='source_identified'?'Source identified':'Verify source'}</span>
                    <span>Link only</span></span><Icon name="next" className="fw-chevron"/>
                </button>)}
              </div>
              <div className="pagefoot"><span>Metadata only · No requirements approved or scored</span>
                <span>Catalog seed {catalog?.seed_revision??'—'}</span></div>
            </section>
            <aside className="detail-card" aria-label="Selected framework details">
              {selected?<>
                <div className="detail-hero"><svg aria-hidden="true" className="mesh" viewBox="0 0 160 120">
                  <g stroke="#fff" fill="none" strokeOpacity=".7"><path d="M9 81 48 47 90 65 120 17 145 54 90 65 113 105 9 81 48 47 113 105 145 54"/></g>
                  <g fill="#fff"><circle cx="9" cy="81" r="4"/><circle cx="48" cy="47" r="4"/><circle cx="90" cy="65" r="4"/><circle cx="120" cy="17" r="4"/><circle cx="145" cy="54" r="4"/><circle cx="113" cy="105" r="4"/></g>
                </svg><div className="detail-icon">{selected.jurisdiction}</div>
                  <div className="detail-kicker"><span className="dot"/>Selected edition</div></div>
                <div className="detail-body"><h2 className="detail-title">{selected.title}</h2>
                  <p className="detail-subtitle">{selected.issuer}</p>
                  <div className="detail-chips"><span className="pill blue">{regions[selected.jurisdiction]}</span>
                    <span className="pill">{sectors[selected.sectors[0] ?? '']??'Reference'}</span>
                    <span className="pill gold">Metadata only</span></div>
                  <section className="detail-section"><h3>Edition details <span className="muted">Reference metadata</span></h3>
                    <div className="facts">
                      <div className="fact"><small>Publisher</small><strong>{selected.issuer}</strong></div>
                      <div className="fact"><small>Edition</small><strong>{selected.edition}</strong></div>
                      <div className="fact"><small>Jurisdiction</small><strong>{regions[selected.jurisdiction]}</strong></div>
                      <div className="fact"><small>Content</small><strong>Link only</strong></div>
                      <div className="fact"><small>Source status</small><strong>{selected.source_status==='source_identified'?'Identified':'Verification pending'}</strong></div>
                      <div className="fact"><small>Approved clauses</small><strong>None</strong></div>
                    </div>
                    <div className="detail-note"><Icon name="info"/>
                      <span>Requirements and applicability need independent review. Full text remains with its publisher.</span></div>
                  </section>
                  <section className="detail-section adopt"><h3>Use in a Program</h3>
                    <div className="adopt-flow">
                      <div className="step"><em>1</em>Select an existing Program</div>
                      <div className="step"><em>2</em>Confirm applicable requirements</div>
                      <div className="step"><em>3</em>Review control and evidence links</div>
                    </div>
                    <button type="button" className="button primary action-full" disabled
                      title="Needs tenant access, verified clauses and governance">Review adoption <Icon name="next"/></button>
                    <div className="right-meta">Requires reviewer approval; no compliance result is created</div>
                    {sourceUrl(selected.source_url)&&<a className="button detail-source" href={sourceUrl(selected.source_url)??undefined}
                      target="_blank" rel="noopener noreferrer">Open publisher source <Icon name="external"/></a>}
                  </section>
                </div>
              </>:<div className="inline-state"><h3>No edition selected</h3>
                <p>{loading==='ready'?'Select an edition or clear your filters.':'Edition details appear when the catalog is available.'}</p></div>}
            </aside>
          </div>

  </>
}
