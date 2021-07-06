import { ListenNode } from 'botpress/sdk'
import { removeSuccessFailureNodes } from './ndu-to-nlu'
interface FlowNodeView {
  nodes: {
    id: string
    position: { x: number; y: number }
  }[]
}

describe('Migrate NDU to NLU workflow', () => {
  let flow: ListenNode = {
    version: '0.0.1',
    catchAll: {},
    startNode: 'entry',
    description: '',
    nodes: [
      {
        id: 'fbcb453a74',
        name: 'success',
        onEnter: [],
        onReceive: null,
        next: [],
        type: 'success'
      },
      {
        id: '82acdeb93f',
        name: 'failure',
        onEnter: [],
        onReceive: null,
        next: [],
        type: 'failure'
      },
      {
        id: '3c6af6e18a',
        name: 'node-faf0',
        next: [
          {
            condition: 'true',
            node: 'node-1d57'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'trigger',
        conditions: [
          {
            id: 'user_intent_is',
            params: {
              intentName: 'service-now.tickets'
            }
          }
        ],
        activeWorkflow: false
      },
      {
        id: '8c10b46e2d',
        name: 'node-1d57',
        next: [
          {
            condition: 'true',
            node: ''
          }
        ],
        onEnter: ['unanswered_response {"name":"","value":""}'],
        onReceive: null,
        type: 'execute'
      }
    ]
  }

  let flowUi: FlowNodeView = {
    nodes: [
      {
        id: 'fbcb453a74',
        position: {
          x: 1000,
          y: 100
        }
      },
      {
        id: '82acdeb93f',
        position: {
          x: 1000,
          y: 200
        }
      },
      {
        id: '3c6af6e18a',
        position: {
          x: 1360,
          y: 195
        }
      },
      {
        id: '8c10b46e2d',
        position: {
          x: 1685,
          y: 240
        }
      }
    ]
  }

  it('Returns flow and flow UI without Start and End  component', async () => {
    removeSuccessFailureNodes(flow, flowUi)
    const expectFlow: ListenNode = {
      version: '0.0.1',
      catchAll: {},
      startNode: 'entry',
      description: '',
      nodes: [
        {
          id: '3c6af6e18a',
          name: 'node-faf0',
          next: [
            {
              condition: 'true',
              node: 'node-1d57'
            }
          ],
          onEnter: [],
          onReceive: null,
          type: 'trigger',
          conditions: [
            {
              id: 'user_intent_is',
              params: {
                intentName: 'service-now.tickets'
              }
            }
          ],
          activeWorkflow: false
        },
        {
          id: '8c10b46e2d',
          name: 'node-1d57',
          next: [
            {
              condition: 'true',
              node: ''
            }
          ],
          onEnter: ['unanswered_response {"name":"","value":""}'],
          onReceive: null,
          type: 'execute'
        }
      ]
    }

    const expectFlowUI: FlowNodeView = {
      nodes: [
        {
          id: '3c6af6e18a',
          position: {
            x: 1360,
            y: 195
          }
        },
        {
          id: '8c10b46e2d',
          position: {
            x: 1685,
            y: 240
          }
        }
      ]
    }
    expect(flow).toEqual(expectFlow)
    expect(flowUi).toEqual(expectFlowUI)
  })
})
