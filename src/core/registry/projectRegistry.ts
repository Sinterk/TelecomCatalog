import type { ProjectModule } from './types'

/**
 * Registro global de módulos de proyecto.
 * Los módulos se registran en su propio index.ts, nunca aquí.
 * El shell (App.tsx) lee del registro para construir rutas y navegación.
 */
class ProjectRegistry {
  private modules = new Map<string, ProjectModule>()

  register(mod: ProjectModule): void {
    if (this.modules.has(mod.id)) {
      console.warn(`[Registry] Módulo "${mod.id}" ya registrado — sobreescribiendo`)
    }
    this.modules.set(mod.id, mod)
  }

  getAll(): ProjectModule[] {
    return Array.from(this.modules.values())
  }

  get(id: string): ProjectModule | undefined {
    return this.modules.get(id)
  }
}

export const registry = new ProjectRegistry()
