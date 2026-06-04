import { registry } from '@/core/registry/projectRegistry'
import { isOffice } from '@/core/mode'
import { OfficeHome }   from './components/office/OfficeHome'
import { OfficeEditor } from './components/office/OfficeEditor'
import { FieldHome }    from './components/field/FieldHome'
import { FieldEditor }  from './components/field/FieldEditor'

registry.register({
  id: 'preventivos',
  name: 'Preventivos',
  icon: isOffice ? '🏢' : '📡',
  description: isOffice
    ? 'Gestión de cuadrantes preventivos (modo oficina)'
    : 'Captura de fotos en terreno',
  driveRootFolder: 'TelecomCatalog / Preventivos',
  indexPath: isOffice ? '/preventivos/office' : '/preventivos/field',
  routes: isOffice
    ? [
        { path: '/preventivos/office',     label: 'Cuadrantes', component: OfficeHome   },
        { path: '/preventivos/office/:id', label: 'Editor',     component: OfficeEditor },
      ]
    : [
        { path: '/preventivos/field',      label: 'Cuadrantes', component: FieldHome    },
        { path: '/preventivos/field/:id',  label: 'Puntos',     component: FieldEditor  },
      ],
})
