import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { registry } from '@/core/registry/projectRegistry'
import { Layout } from '@/ui/Layout'
import { RoleSelector } from '@/ui/RoleSelector'
import { getRole } from '@/core/role'
import type { AppRole } from '@/core/role'

// Auto-registrar módulos al importar
import '@/modules/preventivos'

export function App() {
  const [role, setRole] = useState<AppRole | null>(getRole)
  const modules = registry.getAll()
  const defaultPath = modules[0]?.indexPath ?? '/'

  if (!role) {
    return <RoleSelector onSelect={(r) => setRole(r)} />
  }

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
