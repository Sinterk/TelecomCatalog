import { registry } from '@/core/registry/projectRegistry'
import { Home }      from './components/Home'
import { Editor }    from './components/Editor'
import { PlanoView } from './components/PlanoView'

registry.register({
  id: 'preventivos',
  name: 'Preventivos',
  icon: '📡',
  description: 'Levantamientos preventivos de telecomunicaciones',
  driveRootFolder: '',
  indexPath: '/preventivos',
  routes: [
    { path: '/preventivos',           label: 'Inicio', component: Home      },
    { path: '/preventivos/:id',       label: 'Editor', component: Editor    },
    { path: '/preventivos/:id/plano', label: 'Plano',  component: PlanoView },
  ],
})
