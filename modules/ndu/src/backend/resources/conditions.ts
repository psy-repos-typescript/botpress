import * as sdk from 'botpress/sdk'
import _ from 'lodash'

export interface MigrationCondition {
  id: string
  /** String displayed in the dropdown */
  evaluate: (params: any) => string
}

export const migrationConditions: MigrationCondition[] = [
  {
    id: 'user_channel_is',
    evaluate: params => {
      return ''
    }
  },
  {
    id: 'user_language_is',
    evaluate: params => {
      return ''
    }
  },
  {
    id: 'user_intent_is',
    evaluate: params => {
      return `event.nlu.intent.name = '${params.intentName}'`
    }
  },
  {
    id: 'user_is_authenticated',
    evaluate: event => {
      return ''
    }
  },
  {
    id: 'user_intent_misunderstood',
    evaluate: event => {
      return "event.nlu.intent.name = 'none'"
    }
  },
  {
    id: 'user_topic_source',
    evaluate: params => {
      return ''
    }
  },
  {
    id: 'raw_js',
    evaluate: params => {
      return params.expression
    }
  },
  {
    id: 'user_already_spoke',
    evaluate: event => {
      return ''
    }
  },
  {
    id: 'outside_flow_node',
    evaluate: event => {
      return ''
    }
  },
  {
    id: 'custom_confidence',
    evaluate: params => {
      return ''
    }
  },
  {
    id: 'always',
    evaluate: () => {
      return ''
    }
  },
  {
    id: 'type_text',
    evaluate: params => {
      return ''
    }
  },
  {
    id: 'workflow_ended',
    evaluate: params => {
      return ''
    }
  }
]
