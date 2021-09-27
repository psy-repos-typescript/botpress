import { TYPES } from 'core/app/types'
import { StateManager } from 'core/dialog'
import { ContainerModule, interfaces } from 'inversify'

import { FlowService } from './flow/flow-service'

export const DialogContainerModule = new ContainerModule((bind: interfaces.Bind) => {
  bind<FlowService>(TYPES.FlowService)
    .to(FlowService)
    .inSingletonScope()

  bind<StateManager>(TYPES.StateManager)
    .to(StateManager)
    .inSingletonScope()
})
