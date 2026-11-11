import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icons'
import type { IconKey } from './Icons'

export type Screen = 'frameworks' | 'home' | 'programs' | 'assessment'
const nav:{label:string;icon:IconKey;screen?:Screen}[]=[
  {label:'Home',icon:'home',screen:'home'},
  {label:'Frameworks',icon:'layers',screen:'frameworks'},
  {label:'Programs',icon:'grid',screen:'programs'},{label:'Forms',icon:'form',screen:'assessment'},
  {label:'Vendors',icon:'users'},{label:'Risk & Losses',icon:'shield'},
  {label:'Privacy',icon:'lock'},{label:'Reports',icon:'chart'}
]

export function DesignShell({screen,onNavigate,children,sessionName}:{sessionName?:string;screen:Screen;onNavigate:(screen:Screen)=>void;children:ReactNode}){
  const [dark,setDark]=useState(()=>{
    try { const saved=localStorage.getItem('clearsight-theme'); if(saved==='dark'||saved==='light')return saved==='dark' } catch { /* Storage may be unavailable. */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  useEffect(()=>{
    document.documentElement.dataset.theme=dark?'dark':'light'
    try { localStorage.setItem('clearsight-theme',dark?'dark':'light') } catch { /* Theme still works for this session. */ }
  },[dark])
  return <div className="app" data-theme={dark?'dark':'light'}>
    <a href="#content" className="skip-link">Skip to content</a>
    <aside className="sidebar" aria-label="Main navigation">
      <div className="logo"><div className="logo-mark" aria-hidden="true"><i className="a"/><i className="b"/><i className="c"/></div>
        <div><strong>ClearSight</strong><small>Governance · Risk · Compliance</small></div></div>
      <nav className="nav" aria-label="Primary">
        {nav.map(item=>item.screen
          ? <button key={item.label} type="button" className={'nav-item'+(screen===item.screen?' active':'')}
              aria-current={screen===item.screen?'page':undefined} onClick={()=>onNavigate(item.screen as Screen)}>
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
        <button className="top-icon theme-toggle" type="button"
          onClick={()=>setDark(value=>!value)} aria-pressed={dark}
          aria-label={dark?'Switch to light appearance':'Switch to dark appearance'}
          title={dark?'Switch to light appearance':'Switch to dark appearance'}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{dark
            ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>
            : <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>}</svg>
        </button>
        <button className="top-icon" type="button" disabled aria-label="Notifications unavailable"><Icon name="bell"/></button>
        <div className="profile"><div className="avatar">—</div><div><strong>{sessionName || 'Not signed in'}</strong><small>Foundation preview</small></div></div>
      </header>
      <main className={screen==='programs' ? 'content program-page' : screen==='assessment' ? 'content assessment-page' : 'content'} id="content">{children}</main>
    </div>
  </div>
}
