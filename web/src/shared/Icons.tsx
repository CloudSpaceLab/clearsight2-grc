import type { ReactNode } from 'react'

export type IconKey = 'home'|'layers'|'grid'|'form'|'users'|'shield'|'lock'|'chart'|'setting'|
  'search'|'chevron'|'next'|'bell'|'globe'|'plus'|'filter'|'info'|'external'
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
export function Icon({name,className=''}:{name:IconKey;className?:string}) {
  return <svg aria-hidden="true" focusable="false" className={'icon '+className}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}
