import { getRuntime } from '@botpress/runtime'
import * as sdk from 'botpress/sdk'
import { TYPES } from 'core/app/types'
import { TimedPerfCounter } from 'core/misc/timed-perf'
import { inject, injectable, tagged } from 'inversify'
import joi from 'joi'
import _ from 'lodash'
import { VError } from 'verror'
import yn from 'yn'
import { Event } from './event-sdk-impl'

const directionRegex = /^(incoming|outgoing)$/

const eventSchema = {
  type: joi.string().required(),
  channel: joi.string().required(),
  target: joi.string().required(),
  id: joi.number().required(),
  messageId: joi
    .string()
    .guid()
    .optional(),
  direction: joi
    .string()
    .regex(directionRegex)
    .required(),
  preview: joi.string().optional(),
  payload: joi.object().required(),
  botId: joi.string().required(),
  threadId: joi.string().optional(),
  createdOn: joi.date().required(),
  flags: joi.any().required(),
  suggestions: joi.array().optional(),
  state: joi.any().optional(),
  debugger: joi.bool().optional(),
  credentials: joi.any().optional(),
  incomingEventId: joi.string().optional(),
  activeProcessing: joi.object().optional(),
  processing: joi.object().optional(),
  ndu: joi.any().optional(),
  nlu: joi
    .object({
      intent: joi.object().optional(),
      intents: joi
        .array()
        .items(joi.object())
        .optional(),
      ambiguous: joi.boolean(),
      language: joi.string().optional(),
      detectedLanguage: joi.string().optional(),
      entities: joi
        .array()
        .items(joi.object())
        .optional(),
      slots: joi.any(),
      errored: joi.bool().optional(),
      includedContexts: joi
        .array()
        .items(joi.string())
        .optional(),
      ms: joi.number().optional(),
      spellChecked: joi.string().optional()
    })
    .optional()
    .default({})
}

const mwSchema = {
  name: joi.string().required(),
  handler: joi.func().required(),
  description: joi.string().required(),
  direction: joi
    .string()
    .regex(directionRegex)
    .required(),
  order: joi.number().default(0),
  enabled: joi.boolean().default(true),
  timeout: joi.string().optional()
}

const debug = DEBUG('middleware')
const debugIncoming = debug.sub('incoming')
const debugOutgoing = debug.sub('outgoing')

@injectable()
export class EventEngine {
  private readonly _incomingPerf = new TimedPerfCounter('mw_incoming')
  private readonly _outgoingPerf = new TimedPerfCounter('mw_outgoing')

  private incomingMiddleware: sdk.IO.MiddlewareDefinition[] = []
  private outgoingMiddleware: sdk.IO.MiddlewareDefinition[] = []

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'EventEngine')
    private logger: sdk.Logger
  ) {
    this.setupPerformanceHooks()
  }

  public getMiddlewares() {
    return { incoming: this.incomingMiddleware, outgoing: this.outgoingMiddleware }
  }

  /**
   * Outputs to the console the event I/O in real-time
   * Usage: set `BP_DEBUG_IO` to `true`
   */
  private setupPerformanceHooks() {
    if (!yn(process.env.BP_DEBUG_IO)) {
      return
    }

    let totalIn = 0
    let totalOut = 0

    this._incomingPerf.subscribe(metric => {
      totalIn += metric
      this.logger.level(sdk.LogLevel.PRODUCTION).debug(`(perf) IN <- ${metric}/s | total = ${totalIn}`)
    })

    this._outgoingPerf.subscribe(metric => {
      totalOut += metric
      this.logger.level(sdk.LogLevel.PRODUCTION).debug(`(perf) OUT -> ${metric}/s | total = ${totalOut}`)
    })
  }

  register(middleware: sdk.IO.MiddlewareDefinition) {
    this.validateMiddleware(middleware)
    if (middleware.direction === 'incoming') {
      debugIncoming('register %o', middleware)
      this.incomingMiddleware.push(middleware)
      this.incomingMiddleware = _.sortBy(this.incomingMiddleware, mw => mw.order)
    } else {
      debugOutgoing('register %o', middleware)
      this.outgoingMiddleware.push(middleware)
      this.outgoingMiddleware = _.sortBy(this.outgoingMiddleware, mw => mw.order)
    }
  }

  removeMiddleware(middlewareName: string): void {
    const mw = [...this.incomingMiddleware, ...this.outgoingMiddleware].find(x => x.name === middlewareName)
    if (!mw) {
      return
    }

    if (mw.direction === 'incoming') {
      debugIncoming('unregister %o', middlewareName)
      this.incomingMiddleware = this.incomingMiddleware.filter(x => x.name !== middlewareName)
    } else {
      debugOutgoing('unregister %o', middlewareName)
      this.outgoingMiddleware = this.outgoingMiddleware.filter(x => x.name !== middlewareName)
    }
  }

  async sendEvent(event: sdk.IO.Event): Promise<void> {
    this.validateEvent(event)

    const runtime = await getRuntime()
    return runtime.sendEvent(event)
  }

  async replyToEvent(eventDestination: sdk.IO.EventDestination, payloads: any[], incomingEventId?: string) {
    // prettier-ignore
    const keys: (keyof sdk.IO.EventDestination)[] = ['botId', 'channel', 'target', 'threadId']

    for (const payload of payloads) {
      const replyEvent = Event({
        ..._.pick(eventDestination, keys),
        direction: 'outgoing',
        type: payload.type ?? 'text',
        payload,
        incomingEventId
      })

      await this.sendEvent(replyEvent)
    }
  }

  private validateMiddleware(middleware: sdk.IO.MiddlewareDefinition) {
    const result = joi.validate(middleware, mwSchema)
    if (result.error) {
      throw new VError(result.error, 'Invalid middleware definition')
    }
  }

  private validateEvent(event: sdk.IO.Event) {
    if (process.IS_PRODUCTION) {
      // In production we optimize for speed, validation is useful for debugging purposes
      return
    }

    const result = joi.validate(event, eventSchema)
    if (result.error) {
      throw new VError(result.error, 'Invalid Botpress Event')
    }
  }
}
