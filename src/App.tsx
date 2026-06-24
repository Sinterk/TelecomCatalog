import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { registry } from '@/core/registry/projectRegistry'
import { Layout } from '@/ui/Layout'
import { ProjectHome } from '@/ui/ProjectHome'
import { LoginScreen } from '@/ui/LoginScreen'

import '@/modules/preventivos'
import '@/modules/att'

export function App() {
  const modules = registry.getAll()
  const [entered, setEntered] = useState(() => sessionStorage.getItem('guest') === '1')

  if (!entered) {
    return (
      <LoginScreen
        onEnter={() => {
          sessionStorage.setItem('guest', '1')
          setEntered(true)
        }}
      />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProjectHome />} />
        {modules.flatMap((mod) =>
          mod.routes.map((route) => {
            const Component = route.component
            return <Route key={route.path} path={route.path} element={<Component />} />
          }),
        )}
        <Route path="*" element={<ProjectHome />} />
      </Routes>
    </Layout>
  )
}
