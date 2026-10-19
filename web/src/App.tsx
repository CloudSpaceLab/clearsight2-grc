import { useEffect, useState } from 'react'
import { DesignShell } from './shared/DesignShell'
import type { Screen } from './shared/DesignShell'
import { FrameworkLibrary } from './features/frameworks/FrameworkLibrary'
import { HomeEmpty } from './features/home/HomeEmpty'
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

export default function App() {
  const [route, setRoute] = useState(routeFromLocation)
  useEffect(() => {
    const sync = () => setRoute(routeFromLocation())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  function navigate(screen: Screen, programId?: string) {
    const location = new URL(window.location.href)
    location.searchParams.set('screen', screen)
    if (screen === 'programs' && programId) location.searchParams.set('program', programId)
    else location.searchParams.delete('program')
    window.history.pushState(null, '', location)
    setRoute({ screen, programId: screen === 'programs' ? programId ?? null : null })
  }

  return <DesignShell screen={route.screen} onNavigate={screen => navigate(screen)}>
    {route.screen === 'home' ? <HomeEmpty browseFrameworks={() => navigate('frameworks')} />
      : route.screen === 'programs'
        ? <ProgramWorkspace programId={route.programId}
            onSelectProgram={id => navigate('programs', id)}
            openFrameworks={() => navigate('frameworks')} />
      : route.screen === 'assessment' ? <AssessmentWorkspace openPrograms={() => navigate('programs')} />
      : <FrameworkLibrary />}
  </DesignShell>
}
