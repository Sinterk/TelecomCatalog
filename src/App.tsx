import { Routes, Route, Navigate } from 'react-router-dom'
import { registry } from '@/core/registry/projectRegistry'
import { Layout } from '@/ui/Layout'

import '@/modules/preventivos'

export function App() {
  const modules = registry.getAll()
  const defaultPath = modules[0]?.indexPath ?? '/'

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        {modules.flatMap((mod) =>
          mod.routes.map((route) => {
            const Component = route.component
            return <Route key={route.path} path={route.path} element={<Component />} />
          }),
        )}
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </Layout>
  )
}
