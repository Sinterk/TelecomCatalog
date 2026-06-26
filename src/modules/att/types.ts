export interface FotoEntry {
  previewUrl: string
  fileName: string
  blobId?: string
  capturedAt: string
  annotated: boolean
}

export type TipoProyecto =
  | 'acceso_fijo'
  | 'backhaul'
  | 'conectividad_movil'
  | 'acceso_b2b'
  | 'proyectos_acceso'
  | 'modernizacion'
  | 'vulnerabilidad'
  | 'adaptacion'

export const TIPO_PROYECTO_LABELS: Record<TipoProyecto, string> = {
  acceso_fijo:        'Ing. Redes Acceso Fijo',
  backhaul:           'Backhaul',
  conectividad_movil: 'Ing. Conectividad Móvil',
  acceso_b2b:         'Ingeniería Acceso B2B',
  proyectos_acceso:   'Sbgcia Proyectos Acceso',
  modernizacion:      'Modernización',
  vulnerabilidad:     'Vulnerabilidad',
  adaptacion:         'Adaptación',
}

export interface TramoCable {
  id: string
  tipoCable: string
  metraje: string
  desde: string
  hasta: string
}

export interface Hito {
  id: string
  fecha: string        // vacío = sin fecha
  descripcion: string
}

export interface IngresoRedInfo {
  nodo: string
  rack: string
  odf: string
  fo: string
}

export interface InfraItem {
  usa: boolean
  cantidad: string
  compania: string
}

export interface Infraestructura {
  postesElectricos:  InfraItem
  postesOtraTeleco:  InfraItem
  ductosOtraTeleco:  InfraItem
  fibraOtraCompania: { usa: boolean }
  postesEntel:       { usa: boolean }
}

export type FotoCategoria =
  | 'tendidoFO'
  | 'cmic'
  | 'medicionTraza'
  | 'reparacionDucto'
  | 'mufaProyectada'
  | 'ingresoRed'

export interface AttRecord {
  id: string
  createdAt: number
  updatedAt: number

  // Sección 1 — Tipo de proyecto
  tipoProyecto: TipoProyecto | ''

  // Sección 2 — Datos del proyecto
  ott: string
  nombreProyecto: string
  iniciativa: string
  ingenieroProyecto: string
  jefeProyecto: string
  comuna: string
  region: string
  contratista: string
  coordsInicio: { lat: string; lng: string }
  coordsTermino: { lat: string; lng: string }

  // Sección 3 — Descripción general
  tramos: TramoCable[]
  descripcionCabecera: string
  instalaCMIC: boolean
  instalaMufas: boolean
  tieneIngresoRed: boolean
  ingresoRed: IngresoRedInfo
  tieneReparacionDucto: boolean
  hitos: Hito[]
  fotoAerea?: FotoEntry

  // Sección 4 — Infraestructura
  infraestructura: Infraestructura

  // Sección 5 — Fotos por categoría
  fotos: Partial<Record<FotoCategoria, FotoEntry[]>>
}
