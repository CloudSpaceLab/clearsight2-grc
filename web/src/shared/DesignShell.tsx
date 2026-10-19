import type { ReactNode } from 'react'
import { Icon } from './Icons'
import type { IconKey } from './Icons'

export type Screen = 'frameworks' | 'home'
const nav:{label:string;icon:IconKey;screen?:Screen}[]=[
  {label:'Home',icon:'home',screen:'home'},
  {label:'Frameworks',icon:'layers',screen:'frameworks'},
  {label:'Programs',icon:'grid'},{label:'Forms',icon:'form'},
  {label:'Vendors',icon:'users'},{label:'Risk & Losses',icon:'shield'},
  {label:'Privacy',icon:'lock'},{label:'Reports',icon:'chart'}
]

export function DesignShell({screen,onNavigate,children}:{screen:Screen;onNavigate:(screen:Screen)=>void;children:ReactNode}){
  return <div className="app">
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
        <button className="top-icon" type="button" disabled aria-label="Notifications unavailable"><Icon name="bell"/></button>
        <div className="profile"><div className="avatar">—</div><div><strong>Not signed in</strong><small>Foundation preview</small></div></div>
      </header>
      <main className="content" id="content">{children}</main>
    </div>
  </div>
}
