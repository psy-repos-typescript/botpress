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
      return "event.channel === '" + params.channelName + "'"
    }
  },
  {
    id: 'user_language_is',
    evaluate: params => {
      return "event.state.user.language === '" + params.language + "'"
    }
  },
  {
    id: 'user_intent_is',
    evaluate: params => {
      return "event.nlu.intent.name === '" + params.intentName + "'"
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
      return "event.nlu.intent.name === 'none'"
    }
  },
  {
    id: 'user_topic_source',
    evaluate: params => {
      return (
        "event.state.session.lastTopics && event.state.session.lastTopics[event.state.session.lastTopics.length -1 ] === '" +
        params.topicName +
        "'"
      )
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
      return 'event.state.session.lastMessages && event.state.session.lastMessages.length > 0'
    }
  },
  {
    id: 'outside_flow_node',
    evaluate: event => {
      return '!event.state.context.currentFlow && !event.state.context.currentNode'
    }
  },
  // Not use what to-do with it
  // {
  //   id: 'custom_confidence',
  //   evaluate: params => {
  //     return ''
  //   }
  // },
  {
    id: 'always',
    evaluate: () => {
      return ''
    }
  }
  // Probably should be transformed into a skill choice
  // {
  //   id: 'type_text',
  //   evaluate: params => {
  //     return ''
  //   }
  // },
]
