import * as sdk from 'botpress/sdk'
import _ from 'lodash'
import { bots as mountedBots } from '../'
import { migrationConditions } from './conditions'
interface FlowNodeView {
  nodes: {
    id: string
    position: { x: number; y: number }
  }[]
}

const STANDARD_NODE = 'standard'
const DEFAULT_NODE_NAME = 'entry'

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

export const removeListenNodeAlways = (flow: sdk.Flow) => {
  for (const node of flow.nodes) {
    if (node.onReceive != null) {
      // A listen node is a Skill node. I don't know why but all the skill node
      // was containing the conditions id: 'always'. It's a big assumption
      const listenNode = (node as unknown) as sdk.ListenNode
      // I'm checking if one of the element is a condition that is always true
      listenNode.triggers?.forEach(x => (x.conditions = x.conditions.filter(y => y.id !== 'always')))
    }
  }
}

export const transformExecuteNodeToStandardNode = (flow: sdk.Flow) => {
  for (const node of flow.nodes) {
    if (node.type === 'execute') {
      const standardNode = (node as unknown) as sdk.FlowNode
      standardNode.type = 'standard'
    }
  }
}
export const transformListenNodeToStandardNode = (flow: sdk.Flow) => {
  for (const node of flow.nodes) {
    if (node.type === 'listen') {
      const standardNode = (node as unknown) as sdk.FlowNode
      standardNode.type = 'standard'
      standardNode.onReceive = []
    }
  }
}
export const transformActionNodeToStandardNode = (flow: sdk.Flow) => {
  // The logic for the action node is not implemented
  for (const [index, node] of flow.nodes.entries()) {
    if (node.type === 'action') {
      // Will created a undefined properties in the array. I will remove the undefined property at the end
      // I should update the frontend
      delete flow.nodes[index]
    }
  }
  // Remove all the Undefined Value
  flow.nodes = flow.nodes.filter(Boolean)
}

export const transformRouteNodeToStandardNode = (flow: sdk.Flow) => {
  // The logic for the action node is not implemented
  for (const [index, node] of flow.nodes.entries()) {
    if (node.type === 'router') {
      const standardNode = (node as unknown) as sdk.FlowNode
      standardNode.type = STANDARD_NODE
    }
  }
}
export const transformConditionNodeToStandardNode = (flow: sdk.Flow, main: sdk.Flow, pathName: string) => {
  // Get entry main
  const mainEntryNode = _.find<sdk.FlowNode>(main.nodes, { name: DEFAULT_NODE_NAME })
  for (const node of flow.nodes) {
    const triggerNode = (node as unknown) as sdk.TriggerNode
    // Remove the node from the flow
    if (triggerNode.type === 'trigger') {
      // Migrate all the trigger node into the entry main file

      // A trigger have only one next node
      const transitNode = triggerNode.next[0].node
      triggerNode.next = []
      for (const rawTrigger of triggerNode.conditions) {
        let removeCondition = false

        const expression = _.find(migrationConditions, { id: rawTrigger.id })
        if (expression) {
          mainEntryNode.next.push({
            condition: expression.evaluate(rawTrigger.params),
            node: `${pathName}#${transitNode}`
          })
          removeCondition = true
        }
        // Remove the condition
        if (removeCondition === true) {
          triggerNode.conditions = []
          triggerNode.type = STANDARD_NODE
        }
      }
    }
  }
}

export const validContentType = async (contentType: string, botId: string, bp: typeof sdk): Promise<boolean> => {
  const config = await bp.bots.getBotById(botId)

  return config.imports.contentTypes.includes(contentType ?? '')
}

export const transformSaySomethingToStandardNode = async (flow: sdk.Flow, botId: string, bp: typeof sdk) => {
  for (const node of flow.nodes) {
    if (node.type === 'say_something') {
      const standardNode = (node as unknown) as sdk.FlowNode
      standardNode.type = STANDARD_NODE
      try {
        const contentType = (await validContentType(standardNode.content.contentType, botId, bp))
          ? standardNode.content.contentType
          : 'builtin_text'
        const createdNode = await bp.cms.createOrUpdateContentElement(botId, contentType, standardNode.content.formData)
        standardNode.content = { contentType: '', formData: {} }
        //@ts-ignore
        standardNode.onEnter.push(createdNode)
      } catch (e) {
        bp.logger.warn(`[NDU Migration] - ${e}`)
      }
    }
  }
}

export const modifiedStartNode = (flow: sdk.Flow) => {
  // Create node to use as a placeholder. The code doesn't like to have no StartNode
  if (!_.find(flow.nodes, { name: DEFAULT_NODE_NAME })) {
    const flowNode: sdk.FlowNode = {
      id: generateUUIDNodeFlow(10),
      name: DEFAULT_NODE_NAME,
      onEnter: null,
      onReceive: null,
      type: STANDARD_NODE,
      next: []
    }
    flow.nodes.push(flowNode)
  }
  flow.startNode = DEFAULT_NODE_NAME
}

export const generateUUIDNodeFlow = (length: number) => {
  return [...Array(length)].map(i => (~~(Math.random() * 36)).toString(36)).join('') // Generate 10 random alpha-numeric char
}
// Special case for the main.flow.json.
export const createEntryNode = (flow: sdk.Flow, flowUI: FlowNodeView) => {
  modifiedStartNode(flow)
  removeSuccessFailureNodes(flow, flowUI)
}

const updateAllFlows = async (ghost: sdk.ScopedGhostService, botId: string, bp: typeof sdk) => {
  const flowsPaths = await ghost.directoryListing('flows', '*.flow.json')
  const mainFlow = await ghost.readFileAsObject<sdk.Flow>('flows', 'main.flow.json')
  const mainFlowUI = await ghost.readFileAsObject<FlowNodeView>('flows', 'main.ui.json')
  createEntryNode(mainFlow, mainFlowUI)
  // Add entry node by default
  for (const flowPath of flowsPaths) {
    const flowUiPath = flowPath.replace('.flow.json', '.ui.json')

    const flow = await ghost.readFileAsObject<sdk.Flow>('flows', flowPath)
    const flowUi = await ghost.readFileAsObject<FlowNodeView>('flows', flowUiPath)

    // The triggers is important you will transfer trigger to action or other properties type
    removeSuccessFailureNodes(flow, flowUi)
    // After this call the node can still have the ListenNode signature. At the end I need to remove all the value ListenNode from this migration
    removeListenNodeAlways(flow)

    // All the Flow need to have a StartNode. I will change the Start Node in Other function
    modifiedStartNode(flow)

    await transformSaySomethingToStandardNode(flow, botId, bp)
    transformExecuteNodeToStandardNode(flow)
    transformListenNodeToStandardNode(flow)
    transformActionNodeToStandardNode(flow)
    transformRouteNodeToStandardNode(flow)
    transformConditionNodeToStandardNode(flow, mainFlow, flowPath)

    try {
      await ghost.upsertFile('flows', flowPath, JSON.stringify(flow, undefined, 2))
      await ghost.upsertFile('flows', flowUiPath, JSON.stringify(flowUi, undefined, 2))
    } catch (e) {
      console.log(e)
    }
  }
  await ghost.upsertFile('flows', 'main.flow.json', JSON.stringify(mainFlow, undefined, 2))
  await ghost.upsertFile('flows', 'main.ui.json', JSON.stringify(mainFlowUI, undefined, 2))
}

const migrateToNLU = async (bp: typeof sdk, botId: string) => {
  const ghost = bp.ghost.forBot(botId)

  // Update the flows
  await updateAllFlows(ghost, botId, bp)

  // Transform the documentation into a older flow
  await bp.config.mergeBotConfig(botId, { oneflow: false })
}

export default migrateToNLU
