import * as sdk from 'botpress/sdk'
import { TYPES } from 'core/app/types'
import Database from 'core/database'
import { inject, injectable } from 'inversify'
import _ from 'lodash'

export class DialogSession {
  constructor(
    public id: string,
    public context: sdk.IO.DialogContext = {},
    public temp_data: any = {},
    public session_data: sdk.IO.CurrentSession = { lastMessages: [], workflows: {} }
  ) {}

  // Timestamps are optional because they have default values in the database
  created_on?: Date
  modified_on?: Date
  context_expiry?: Date
  session_expiry?: Date
}

@injectable()
export class SessionRepository {
  private readonly tableName = 'dialog_sessions'

  constructor(@inject(TYPES.Database) private database: Database) {}

  async delete(id: string): Promise<void> {
    await this.database
      .knex(this.tableName)
      .where({ id })
      .del()
  }
}
