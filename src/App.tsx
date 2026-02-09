import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { InterviewPage } from './pages/InterviewPage'
import { NewProjectPage } from './pages/NewProjectPage'
import { ProjectSelectorPage } from './pages/ProjectSelectorPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { useProjectStore } from './store/projectStore'

function AppRoutes() {
  const navigate = useNavigate()
  useKeyboardShortcuts(navigate)

  return (
    <Routes>
      <Route path="/" element={<ProjectSelectorPage />} />
      <Route path="/new" element={<NewProjectPage />} />
      <Route path="/interview" element={<InterviewPage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const initialize = useProjectStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
