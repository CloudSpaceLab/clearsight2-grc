import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type Region = 'NG' | 'KE' | 'ZA' | 'GH' | 'EU'
type Framework = {
  id:string;title:string;edition:string;jurisdiction:Region;sectors:string[];
  issuer:string;source_url:string;source_status:'source_identified'|'verification_pending';
  content_status:'metadata_only';license:'link_only';requirements:string[]
}
type Catalog = {seed_revision:string;total:number;items:Framework[]}
type Screen = 'frameworks'|'home'
type IconKey = 'home'|'layers'|'grid'|'form'|'users'|'shield'|'lock'|'chart'|'setting'|
  'search'|'chevron'|'next'|'bell'|'globe'|'plus'|'filter'|'info'|'external'
const regions:Record<Region,string> = {
  NG:'Nigeria',KE:'Kenya',ZA:'South Africa',GH:'Ghana',EU:'European Union'
}
const sectors:Record<string,string> = {
  banking:'Banking',fintech:'Fintech',privacy:'Privacy',telecom:'Telecommunications',
  'oil-gas':'Oil & gas','cross-sector':'Cross-sector'
}
const icons:Record<IconKey,ReactNode> = {
  home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  layers:<><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
  form:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  users:<><circle cx="10" cy="7" r="3"/><path d="M3 21v-2a7 7 0 0 1 14 0v2M18 5a3 3 0 0 1 0 6m3 10v-2a7 7 0 0 0-3-5.7"/></>,
  shield:<><path d="m12 22 7-4V6l-7-4-7 4v12l7 4Z"/><path d="m9 12 2 2 4-4"/></>,
  lock:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></>,
  chart:<path d="M4 21V11h4v10M10 21V4h4v17M16 21v-8h4v8"/>,
  setting:<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  chevron:<path d="m7 10 5 5 5-5"/>,
  next:<path d="m9 5 7 7-7 7"/>,
  bell:<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 22h4"/>,
  globe:<><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c6 6 6 14 0 20M12 2c-6 6-6 14 0 20"/></>,
  plus:<path d="M12 4v16M4 12h16"/>,
  filter:<path d="M4 7h16M7 12h10M10 17h4"/>,
  info:<><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/></>,
  external:<><path d="M14 4h6v6m0-6-9 9"/><path d="M20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1 1-1h6"/></>
}
function Icon({name,className=''}:{name:IconKey;className?:string}) {
  return <svg aria-hidden="true" focusable="false" className={'icon '+className}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}
const nav:{label:string;icon:IconKey;screen?:Screen}[]=[
  {label:'Home',icon:'home',screen:'home'},
  {label:'Frameworks',icon:'layers',screen:'frameworks'},
  {label:'Programs',icon:'grid'},{label:'Forms',icon:'form'},
  {label:'Vendors',icon:'users'},{label:'Risk & Losses',icon:'shield'},
  {label:'Privacy',icon:'lock'},{label:'Reports',icon:'chart'}
]
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
function App(){
  const [screen,setScreen]=useState<Screen>('frameworks')
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
  return <div className="app">
    <a href="#content" className="skip-link">Skip to content</a>
    <aside className="sidebar" aria-label="Main navigation">
      <div className="logo"><div className="logo-mark" aria-hidden="true"><i className="a"/><i className="b"/><i className="c"/></div>
        <div><strong>ClearSight</strong><small>Governance · Risk · Compliance</small></div></div>
      <nav className="nav" aria-label="Primary">
        {nav.map(item=>item.screen
          ? <button key={item.label} type="button" className={'nav-item'+(screen===item.screen?' active':'')}
              aria-current={screen===item.screen?'page':undefined} onClick={()=>setScreen(item.screen as Screen)}>
              <Icon name={item.icon}/><span>{item.label}</span></button>
          : <span key={item.label} className="nav-item" aria-disabled="true"
              title="Requires authenticated operational services"><Icon name={item.icon}/><span>{item.label}</span></span>)}
      </nav>
      <div className="side-bottom"><span className="nav-item" aria-disabled="true"><Icon name="setting"/><span>Settings</span></span>
        <div className="release">ClearSight 2 · Foundation preview<br/>October 2026</div></div>
    </aside>
    <div className="main">
      <header className="topbar">
        {(['Branches','Departments','Teams','Groups'] as const).map((label,i)=><button key={label} disabled
          className="scope" type="button" title="Requires authorized organization scope">
          <Icon name={i===2?'users':i===0||i===3?'grid':'layers'}/>{label}<Icon name="chevron" className="chev"/></button>)}
        <div className="grow"/>
        <button type="button" className="global-search" disabled title="Requires authorized search">
          <Icon name="search"/>Search unavailable</button>
        <button className="top-icon" type="button" disabled aria-label="Notifications unavailable"><Icon name="bell"/></button>
        <div className="profile"><div className="avatar">—</div><div><strong>Not signed in</strong><small>Foundation preview</small></div></div>
      </header>
      <main className="content" id="content">
        {screen==='home'?<>
          <section className="page-heading"><div className="heading-copy"><div className="eyebrow">Oversight / Home</div>
            <h1>Enterprise Control Tower</h1><p>Connect an authorized organization to see current risk, compliance and work.</p></div></section>
          <div className="inline-state"><h3>No organization connected</h3>
            <p>Source-backed measures and approvals require authenticated tenant access. No illustrative counts are shown.</p>
            <button type="button" className="button primary" onClick={()=>setScreen('frameworks')}>Browse framework references <Icon name="next"/></button></div>
        </>:<>
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
                      <span className="tag">{sectors[f.sectors[0]]??'Reference'}</span></span></span>
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
                    <span className="pill">{sectors[selected.sectors[0]]??'Reference'}</span>
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
        </>}
      </main>
    </div>
  </div>
}
export default App
