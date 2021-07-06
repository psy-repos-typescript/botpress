import * as sdk from 'botpress/sdk'
import _ from 'lodash'
import { bots as mountedBots } from '../'

interface FlowNodeView {
  nodes: {
    id: string
    position: { x: number; y: number }
  }[]
}

// Remove the Workflow success and Workflow end in the frontend
export const removeSuccessFailureNodes = (flow: sdk.Flow, flowUi: FlowNodeView) => {
  const nodeTypes = new Map<sdk.FlowNodeType, sdk.FlowNodeType>([
    ['success', 'success'],
    ['failure', 'failure']
  ])
  // Get the Id the remove from the Flow and remove in fromm from the front-end
  const flowToRemove = flow.nodes.filter(x => nodeTypes.has(x.type))

  flowToRemove.forEach(invalidFLow => {
    // Remove Flow node
    _.remove(flow.nodes, x => x.id === invalidFLow.id)
    // Remove Frontend Node
    _.remove(flowUi.nodes, x => x.id === invalidFLow.id)
  })
  return { flow, flowUi }
}

const updateAllFlows = async (ghost: sdk.ScopedGhostService) => {
  const flowsPaths = await ghost.directoryListing('flows', '*.flow.json')

  for (const flowPath of flowsPaths) {
    const flowUiPath = flowPath.replace('.flow.json', '.ui.json')

    const flow = await ghost.readFileAsObject<sdk.Flow>('flows', flowPath)
    const flowUi = await ghost.readFileAsObject<FlowNodeView>('flows', flowUiPath)

    // The triggers is important you will transfer trigger to action or other properties type
    removeSuccessFailureNodes(flow, flowUi)

    // I use upsert to update the current file
    await ghost.upsertFile('flows', flowPath, JSON.stringify(flow, undefined, 2))
    await ghost.upsertFile('flows', flowUiPath, JSON.stringify(flowUi, undefined, 2))
  }
}

const migrateToNLU = async (bp: typeof sdk, botId: string) => {
  const ghost = bp.ghost.forBot(botId)

  // Update the flows
  await updateAllFlows(ghost)

  // Transform the documentation into a older flow
  await bp.config.mergeBotConfig(botId, { oneflow: false })

  console.log(mountedBots[botId])
}

export default migrateToNLU
