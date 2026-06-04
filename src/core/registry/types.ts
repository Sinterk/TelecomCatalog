import type { ComponentType } from 'react'

export interface ModuleRoute {
  path: string
  label: string
  /** Componente (no elemento) — App.tsx lo instancia en render */
  component: ComponentType
}

export interface ProjectModule {
  id: string
  name: string
  icon: string
  description: string
  driveRootFolder: string
  routes: ModuleRoute[]
  indexPath: string
}
