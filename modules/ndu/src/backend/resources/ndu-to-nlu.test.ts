import 'reflect-metadata'
import { ListenNode, TriggerNode, FlowNode } from 'botpress/sdk'
import * as NDU from './ndu-to-nlu'

interface FlowNodeView {
  nodes: {
    id: string
    position: { x: number; y: number }
  }[]
}

describe('Migrate NDU to NLU workflow', () => {
  let flow: ListenNode
  let flowToTest: FlowNode[]
  let flowToExpected: FlowNode[]

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
    flowToTest = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: []
      }
    ]
    flowToExpected = [
      {
        version: '0.0.1',
        catchAll: {},
        startNode: 'entry',
        description: '',
        nodes: []
      }
    ]
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
    NDU.removeSuccessFailureNodes(flow, flowUi)
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
      NDU.removeListenNodeAlways(flow)
      expectedFlow.forEach(expected => {
        expect(flow).toEqual(expected)
      })
    })
  })

  it('Transform Node execute to standard node', async () => {
    flowToTest[0].nodes = [
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

    flowToExpected[0].nodes = [
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

    flowToTest.forEach(test => {
      NDU.transformExecuteNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it.skip('Created buildin_text element from say_something node', async () => {
    // Need to figured how to create an application botpress in the unit-test
    // Create the CMS service
    flowToTest[0].nodes = [
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
    flowToExpected[0].nodes = [
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

    flowToTest.forEach(test => {
      // transformSaySomethingToStandardNode(test, 'weather', bp)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it('Modified execute type to standard node', async () => {
    flowToTest[0].nodes = [
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
    flowToExpected[0].nodes = [
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

    flowToTest.forEach(test => {
      NDU.transformExecuteNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })
  it('Modified Action type to standard node', async () => {
    flowToTest[0].nodes = [
      {
        id: '29980a4b1d',
        name: 'node-b21f-copy',
        next: [
          {
            condition: 'true',
            node: 'success'
          }
        ],
        onEnter: null,
        onReceive: null,
        type: 'action'
      }
    ]
    flowToExpected[0].nodes = []

    flowToTest.forEach(test => {
      NDU.transformActionNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it('Modified Router type to standard node', async () => {
    flowToTest[0].nodes = [
      {
        id: '29980a4b1d',
        name: 'node-b21f-copy',
        next: [
          {
            condition: "event.payload.parameters[0] === 'how_do_know'",
            node: 'node-4bd2'
          },
          {
            condition: "event.payload.parameters[0] === 'not_locked'",
            node: 'node-9c30'
          },
          {
            condition: "event.payload.parameters[0] === 'why_am_i_locked'",
            node: 'node-78c0'
          },
          {
            condition: "event.payload.parameters[0] === 'which_account'",
            node: 'node-caba'
          },
          {
            condition: "event.payload.parameters[0] === 'why_notification'",
            node: 'node-9feb'
          },
          {
            condition: "event.payload.parameters[0] === 'dont_remember'",
            node: 'node-464e'
          },
          {
            condition: "event.payload.parameters[0] === 'remember_pass'",
            node: 'node-0d36'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'router'
      }
    ]
    flowToExpected[0].nodes = [
      {
        id: '29980a4b1d',
        name: 'node-b21f-copy',
        next: [
          {
            condition: "event.payload.parameters[0] === 'how_do_know'",
            node: 'node-4bd2'
          },
          {
            condition: "event.payload.parameters[0] === 'not_locked'",
            node: 'node-9c30'
          },
          {
            condition: "event.payload.parameters[0] === 'why_am_i_locked'",
            node: 'node-78c0'
          },
          {
            condition: "event.payload.parameters[0] === 'which_account'",
            node: 'node-caba'
          },
          {
            condition: "event.payload.parameters[0] === 'why_notification'",
            node: 'node-9feb'
          },
          {
            condition: "event.payload.parameters[0] === 'dont_remember'",
            node: 'node-464e'
          },
          {
            condition: "event.payload.parameters[0] === 'remember_pass'",
            node: 'node-0d36'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'standard'
      }
    ]

    flowToTest.forEach(test => {
      NDU.transformRouteNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it("Create Entry Node if the Flow doesn't have a node", async () => {
    const spy = jest.spyOn(NDU, 'generateUUIDNodeFlow')
    spy.mockReturnValue('abcdefgfig')

    flowToTest[0].nodes = [
      {
        id: 'abcdefgfig',
        name: 'not_entry',
        next: [],
        onEnter: null,
        onReceive: null,
        type: 'standard'
      }
    ]
    flowToExpected[0].nodes = [
      {
        id: 'abcdefgfig',
        name: 'not_entry',
        next: [],
        onEnter: null,
        onReceive: null,
        type: 'standard'
      },
      {
        id: 'abcdefgfig',
        name: 'entry',
        next: [],
        onEnter: null,
        onReceive: null,
        type: 'standard'
      }
    ]

    flowToTest.forEach(test => {
      NDU.modifiedStartNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it("Doesn't create Entry Node because flow Have an entry Node", async () => {
    const spy = jest.spyOn(NDU, 'generateUUIDNodeFlow')
    spy.mockReturnValue('abcdefgfig')

    flowToTest[0].nodes = [
      {
        id: 'abcdefgfig',
        name: 'entry',
        next: [],
        onEnter: null,
        onReceive: null,
        type: 'standard'
      }
    ]
    flowToExpected[0].nodes = [
      {
        id: 'abcdefgfig',
        name: 'entry',
        next: [],
        onEnter: null,
        onReceive: null,
        type: 'standard'
      }
    ]

    flowToTest.forEach(test => {
      NDU.modifiedStartNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it('Transform raw_js condition into a NLU flow', async () => {
    flowToTest[0].nodes = [
      {
        id: '8b50032ee9',
        name: 'node-0075',
        next: [
          {
            condition: 'true',
            node: 'node-9966'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'trigger',
        conditions: [
          {
            id: 'raw_js',
            params: {
              label: 'Raw JS expression',
              expression: "event.payload.method === 'edpp.edpp_faq'"
            }
          }
        ],
        activeWorkflow: false
      }
    ]
    flowToExpected[0].nodes = [
      {
        id: '8b50032ee9',
        name: 'node-0075',
        next: [
          {
            condition: "event.payload.method === 'edpp.edpp_faq'",
            node: 'node-9966'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'standard',
        conditions: [],
        activeWorkflow: false
      }
    ]

    flowToTest.forEach(test => {
      // NDU.transformConditionNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })

  it('Transform condition into a NLU flow', async () => {
    flowToTest[0].nodes = [
      {
        id: '8b50032ee9',
        name: 'node-0075',
        next: [
          {
            condition: 'true',
            node: 'node-9966'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'trigger',
        conditions: [
          {
            id: 'user_intent_is',
            params: {
              intentName: 'api-security.api_security_menu'
            }
          }
        ],
        activeWorkflow: false
      },
      {
        id: '8b50032ee9',
        name: 'node-0075',
        next: [
          {
            condition: 'true',
            node: 'node-9966'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'trigger',
        conditions: [
          {
            id: 'user_intent_is',
            params: {
              intentName: 'api-security.api_security_menu'
            }
          },
          {
            id: 'raw_js',
            params: {
              label: 'Raw JS expression',
              expression: "event.payload.method === 'edpp.edpp_faq'"
            }
          },
          {
            id: 'user_intent_misunderstood',
            params: {}
          }
        ],
        activeWorkflow: false
      }
    ]
    flowToExpected[0].nodes = [
      {
        id: '8b50032ee9',
        name: 'node-0075',
        next: [
          {
            condition: "event.nlu.intent.name === 'api-security.api_security_menu'",
            node: 'node-9966'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'standard',
        conditions: [],
        activeWorkflow: false
      },
      {
        id: '8b50032ee9',
        name: 'node-0075',
        next: [
          {
            condition: "event.nlu.intent.name === 'api-security.api_security_menu'",
            node: 'node-9966'
          },
          {
            condition: "event.payload.method === 'edpp.edpp_faq'",
            node: 'node-9966'
          },
          {
            condition: "event.nlu.intent.name === 'node'",
            node: 'node-9966'
          }
        ],
        onEnter: [],
        onReceive: null,
        type: 'standard',
        conditions: [],
        activeWorkflow: false
      }
    ]

    flowToTest.forEach(test => {
      // NDU.transformConditionNodeToStandardNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })
  it('Remove empty trigger node', async () => {
    flowToTest[0].nodes = [
      {
        id: 'abcdefgfig',
        name: 'entry',
        next: [],
        onEnter: null,
        onReceive: null,
        type: 'standard'
      }
    ]
    flowToExpected[0].nodes = []

    flowToTest.forEach(test => {
      NDU.removeTriggerNode(test)
      flowToExpected.forEach(expected => {
        expect(test).toEqual(expected)
      })
    })
  })
})
