import * as sdk from 'botpress/sdk'
import { TYPES } from 'core/app/types'
import { makeRedisKey } from 'core/distributed'
import { inject, injectable } from 'inversify'
import { Redis } from 'ioredis'
import _ from 'lodash'
import ms from 'ms'
import yn from 'yn'

import { SessionRepository } from './sessions/session-repository'

const getRedisSessionKey = (sessionId: string) => makeRedisKey(`sessionstate_${sessionId}`)

@injectable()
export class StateManager {
  private _redisClient!: Redis
  private useRedis: boolean

  constructor(@inject(TYPES.SessionRepository) private sessionRepo: SessionRepository) {
    // Temporarily opt-in until thoroughly tested
    this.useRedis = process.CLUSTER_ENABLED && yn(process.env.USE_REDIS_STATE)
  }

  public async deleteDialogSession(sessionId: string) {
    await this.sessionRepo.delete(sessionId)

    if (this.useRedis) {
      await this._redisClient.del(getRedisSessionKey(sessionId))
    }
  }
}
