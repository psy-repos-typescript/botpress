import 'reflect-metadata'
import { ListenNode, TriggerNode, FlowNode } from 'botpress/sdk'
import {
  removeSuccessFailureNodes,
  removeListenNodeAlways,
  transformExecuteNodeToStandardNode,
  transformSaySomethingToStandardNode
} from './ndu-to-nlu'

interface FlowNodeView {
  nodes: {
    id: string
    position: { x: number; y: number }
  }[]
}

describe('Migrate NDU to NLU workflow', () => {
  let flow: ListenNode
  beforeEach(async () => {
    flow = {
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
          onReceive: [
            'basic-skills/choice_parse_answer {"contentId":"builtin_single-choice-dZlz5K","invalidContentId":"","keywords":{"yes":["yes","Yes"],"no":["no","No"]},"config":{"nbMaxRetries":3}}'
          ],
          type: 'trigger',
          conditions: [
            {
              id: 'user_intent_is',
              params: {
                intentName: 'service-now.tickets'
              }
            }
          ],
          triggers: [
            {
              conditions: [
                {
                  id: 'always'
                }
              ]
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
  })

  afterEach(() => {})

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

  it('Return flow and flow UI without Start and End component', async () => {
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
          onReceive: [
            'basic-skills/choice_parse_answer {"contentId":"builtin_single-choice-dZlz5K","invalidContentId":"","keywords":{"yes":["yes","Yes"],"no":["no","No"]},"config":{"nbMaxRetries":3}}'
          ],
          type: 'trigger',
          conditions: [
            {
              id: 'user_intent_is',
              params: {
                intentName: 'service-now.tickets'
              }
            }
          ],
          triggers: [
            {
              conditions: [
                {
                  id: 'always'
                }
              ]
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

  it('Return flow and Flow UI without trigger ID always', async () => {
    let flowToTest = [flow]
    let expectedFlow = []

    const expectFlow1: TriggerNode = {
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
          onReceive: [
            'basic-skills/choice_parse_answer {"contentId":"builtin_single-choice-dZlz5K","invalidContentId":"","keywords":{"yes":["yes","Yes"],"no":["no","No"]},"config":{"nbMaxRetries":3}}'
          ],
          type: 'trigger',
          conditions: [
            {
              id: 'user_intent_is',
              params: {
                intentName: 'service-now.tickets'
              }
            }
          ],
          triggers: [
            {
              conditions: []
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

    const flow2: ListenNode = {
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
          onReceive: [
            'basic-skills/choice_parse_answer {"contentId":"builtin_single-choice-dZlz5K","invalidContentId":"","keywords":{"yes":["yes","Yes"],"no":["no","No"]},"config":{"nbMaxRetries":3}}'
          ],
          type: 'trigger',
          conditions: [
            {
              id: 'user_intent_is',
              params: {
                intentName: 'service-now.tickets'
              }
            }
          ],
          triggers: [
            {
              conditions: [{ id: 'always' }]
            },
            {
              conditions: [{ id: 'user_id' }]
            }
          ],
          activeWorkflow: false
        }
      ]
    }
    const expectedFlow2: ListenNode = {
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
          onReceive: [
            'basic-skills/choice_parse_answer {"contentId":"builtin_single-choice-dZlz5K","invalidContentId":"","keywords":{"yes":["yes","Yes"],"no":["no","No"]},"config":{"nbMaxRetries":3}}'
          ],
          type: 'trigger',
          conditions: [
            {
              id: 'user_intent_is',
              params: {
                intentName: 'service-now.tickets'
              }
            }
          ],
          triggers: [
            {
              conditions: [{ id: 'user_id' }]
            }
          ],
          activeWorkflow: false
        }
      ]
    }

    expectedFlow.push(expectFlow1)

    // Actual test
    flowToTest.forEach(flow => {
      removeListenNodeAlways(flow)
      expectedFlow.forEach(expected => {
        expect(flow).toEqual(expected)
      })
    })
  })

  it('Transform Node execute to standard node', async () => {
    let flowToTest: FlowNode[] = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: [
          {
            id: '801692b22b',
            name: 'node-1fb4',
            next: [
              {
                condition: 'true',
                node: 'node-05e9'
              }
            ],
            onEnter: ['ads_unlock_unsubscribe_dropdown {}'],
            onReceive: null,
            type: 'execute'
          },
          {
            id: '1c6d7e7cbe',
            name: 'node-0534',
            next: [
              {
                condition: 'true',
                node: 'node-7d2c-copy'
              }
            ],
            onEnter: ['send_message {"message":"pleasewait"}'],
            onReceive: null,
            type: 'execute'
          }
        ]
      }
    ]
    let flowToExpected: FlowNode[] = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: [
          {
            id: '801692b22b',
            name: 'node-1fb4',
            next: [
              {
                condition: 'true',
                node: 'node-05e9'
              }
            ],
            onEnter: ['ads_unlock_unsubscribe_dropdown {}'],
            onReceive: null,
            type: 'standard'
          },
          {
            id: '1c6d7e7cbe',
            name: 'node-0534',
            next: [
              {
                condition: 'true',
                node: 'node-7d2c-copy'
              }
            ],
            onEnter: ['send_message {"message":"pleasewait"}'],
            onReceive: null,
            type: 'standard'
          }
        ]
      }
    ]

    flowToTest.forEach(test => {
      transformExecuteNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it.skip('Created buildin_text element from say_something node', async () => {
    // Need to figured how to create an application botpress in the unit-test
    // Create the CMS service
    let flowToTest: FlowNode[] = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: [
          {
            id: '29980a4b1d',
            name: 'node-b21f-copy',
            next: [
              {
                condition: 'true',
                node: 'success'
              }
            ],
            onEnter: [],
            onReceive: null,
            type: 'say_something',
            content: {
              createOrUpdateContentElement: 'builtin_text',
              formData: {
                markdown$en: true,
                typing$en: true,
                text$en: '{{temp.response}}'
              }
            }
          }
        ]
      }
    ]
    let flowToExpected: FlowNode[] = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: [
          {
            id: '29980a4b1d',
            name: 'node-b21f-copy',
            next: [
              {
                condition: 'true',
                node: 'success'
              }
            ],
            onEnter: [],
            onReceive: null,
            type: 'standard',
            content: {
              createOrUpdateContentElement: '',
              formData: {}
            }
          }
        ]
      }
    ]

    flowToTest.forEach(test => {
      // transformSaySomethingToStandardNode(test, 'weather', bp)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it('Created Modified execute type to standard node', async () => {
    let flowToTest: FlowNode[] = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: [
          {
            id: '29980a4b1d',
            name: 'node-b21f-copy',
            next: [
              {
                condition: 'true',
                node: 'success'
              }
            ],
            onEnter: ['send_message {"message":"pleasewait"}'],
            onReceive: null,
            type: 'execute'
          }
        ]
      }
    ]
    let flowToExpected: FlowNode[] = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: [
          {
            id: '29980a4b1d',
            name: 'node-b21f-copy',
            next: [
              {
                condition: 'true',
                node: 'success'
              }
            ],
            onEnter: ['send_message {"message":"pleasewait"}'],
            onReceive: null,
            type: 'standard'
          }
        ]
      }
    ]

    flowToTest.forEach(test => {
      transformExecuteNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })
})
