import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

// Shared roving-focus behavior for Program and Assessment tabs.
export function useWorkspaceTabs<T extends string>(
  choices: readonly T[], selected: T, select: (choice:T)=>void,
) {
  const refs=useRef<(HTMLButtonElement|null)[]>([])
  function onKeyDown(event:KeyboardEvent<HTMLElement>) {
    const index=choices.indexOf(selected)
    const targetIndex=event.key==='ArrowRight'?(index+1)%choices.length
      :event.key==='ArrowLeft'?(index+choices.length-1)%choices.length
      :event.key==='Home'?0:event.key==='End'?choices.length-1:-1
    if(targetIndex<0)return
    const next=choices[targetIndex]
    if(next===undefined)return
    event.preventDefault()
    select(next)
    refs.current[targetIndex]?.focus()
  }
  return {onKeyDown,refAt:(index:number)=>(element:HTMLButtonElement|null)=>{refs.current[index]=element}}
}
