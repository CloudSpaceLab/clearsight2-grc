import { V1SessionProvider, useV1Session } from './features/programs/V1Session'
import { useEffect, useState } from 'react'
import { DesignShell } from './shared/DesignShell'
import type { Screen } from './shared/DesignShell'
import { FrameworkLibrary } from './features/frameworks/FrameworkLibrary'
import { HomeWorkspace } from './features/home/HomeWorkspace'
import { ProgramWorkspace } from './features/programs/ProgramWorkspace'
import { readProgramId } from './features/programs/programRecord'
import { AssessmentWorkspace } from './features/assessments/AssessmentWorkspace'

function routeFromLocation(): { screen: Screen; programId: string | null } {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('screen')
  const screen: Screen = value === 'programs' || value === 'assessment' ||
    value === 'home' ? value : 'frameworks'
  return { screen, programId: readProgramId(window.location.search) }
}

const v1Enabled = import.meta.env.VITE_PROGRAM_BACKEND === 'v1'
export default function App() { return v1Enabled ? <V1SessionProvider><AppContent/></V1SessionProvider> : <AppContent/> }
function AppContent() {
  const { context } = useV1Session()
  const [route, setRoute] = useState(routeFromLocation)
  const [formDirty, setFormDirty] = useState(false)
  useEffect(() => {
    const sync = () => setRoute(routeFromLocation())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  function navigate(screen: Screen, programId?: string) {
    if (formDirty && !window.confirm('You have unsaved form changes. Leave without saving?')) return
    setFormDirty(false)
    const location = new URL(window.location.href)
    location.searchParams.set('screen', screen)
    if (screen === 'programs' && programId) location.searchParams.set('program', programId)
    else location.searchParams.delete('program')
    window.history.pushState(null, '', location)
    setRoute({ screen, programId: screen === 'programs' ? programId ?? null : null })
  }

  return <DesignShell sessionName={v1Enabled ? context?.actor.name : undefined} screen={route.screen} onNavigate={screen => navigate(screen)}>
    {route.screen === 'home' ? <HomeWorkspace onNavigate={screen => navigate(screen)} />
      : route.screen === 'programs'
        ? <ProgramWorkspace key={`${context?.actor.id || 'signed-out'}:${route.programId}`} programId={route.programId}
            onSelectProgram={id => navigate('programs', id)}
            onBackPrograms={() => navigate('programs')}
            openFrameworks={() => navigate('frameworks')} />
      : route.screen === 'assessment' ? <AssessmentWorkspace onAuthoringDirty={setFormDirty} />
      : <FrameworkLibrary />}
  </DesignShell>
}
