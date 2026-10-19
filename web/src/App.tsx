import { useState } from 'react'
import { DesignShell } from './shared/DesignShell'
import type { Screen } from './shared/DesignShell'
import { FrameworkLibrary } from './features/frameworks/FrameworkLibrary'
import { HomeEmpty } from './features/home/HomeEmpty'
import { ProgramWorkspace } from './features/programs/ProgramWorkspace'
import { AssessmentWorkspace } from './features/assessments/AssessmentWorkspace'

export default function App(){
  const [screen,setScreen]=useState<Screen>(() => new URLSearchParams(window.location.search).get('screen') === 'assessment' ? 'assessment' : new URLSearchParams(window.location.search).get('screen') === 'programs' ? 'programs' : 'frameworks')
  return <DesignShell screen={screen} onNavigate={setScreen}>
    {screen==='home' ? <HomeEmpty browseFrameworks={()=>setScreen('frameworks')}/>
      :screen==='programs' ? <ProgramWorkspace openFrameworks={()=>setScreen('frameworks')}/>
      :screen==='assessment' ? <AssessmentWorkspace openPrograms={()=>setScreen('programs')}/>
      :<FrameworkLibrary/>}
  </DesignShell>
}
