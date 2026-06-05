export type AppRole = 'tecnico' | 'jp'
export function getRole(): AppRole | null { return (localStorage.getItem('telecom-role') as AppRole) ?? null }
export function setRole(role: AppRole): void { localStorage.setItem('telecom-role', role) }
export function clearRole(): void { localStorage.removeItem('telecom-role') }
