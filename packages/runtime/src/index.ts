global['NativePromise'] = global.Promise

import { getAppDataPath } from '@botpress/common/lib/app_data'
import getos from 'common/getos'
import { EventEmitter2 } from 'eventemitter2'
import fs from 'fs'
import path from 'path'
import yn from 'yn'
import { Debug } from './debug'
import { RuntimeConfig } from './runtime/config/runtime.config'
import { ConverseService } from './runtime/converse'
import { EventEngine } from './runtime/events'
import { TYPES } from './runtime/types'

const printPlainError = err => {
  /* eslint-disable no-console */
  console.log('Error starting botpress')
  console.log(err)
  console.log(err.message)
  console.log('---STACK---')
  console.log(err.stack)
}

global.DEBUG = Debug
global.printErrorDefault = printPlainError

const originalWrite = process.stdout.write

const shouldDiscardError = message =>
  !![
    '[DEP0005]' // Buffer() deprecation warning
  ].find(e => message.indexOf(e) >= 0)

function stripDeprecationWrite(buffer: string, encoding: string, cb?: Function | undefined): boolean
function stripDeprecationWrite(buffer: string | Buffer, cb?: Function | undefined): boolean
function stripDeprecationWrite(this: Function): boolean {
  if (typeof arguments[0] === 'string' && shouldDiscardError(arguments[0])) {
    return (arguments[2] || arguments[1])()
  }

  return originalWrite.apply(this, (arguments as never) as [string])
}

process.IS_FAILSAFE = yn(process.env.BP_FAILSAFE)
process.BOTPRESS_EVENTS = new EventEmitter2()
process.BOTPRESS_EVENTS.setMaxListeners(1000)
global.BOTPRESS_CORE_EVENT = (event, args) => {
  process.BOTPRESS_EVENTS.emit(event, args)
}

process.LOADED_MODULES = {}

process.stderr.write = stripDeprecationWrite

process.on('unhandledRejection', err => {
  global.printErrorDefault(err)
})

process.on('uncaughtException', err => {
  global.printErrorDefault(err)
  if (!process.IS_FAILSAFE) {
    process.exit(1)
  }
})

export interface RuntimeSetup {
  config: RuntimeConfig
  dataFolder: string
  bots: string[]
  middlewares: { outgoing: any; incoming: any }
  api: {
    hooks: any
    actions: any
  }
}

let runtime

export const getRuntime = async (config?: RuntimeSetup): Promise<any> => {
  if (runtime) {
    return runtime
  } else if (!config) {
    return console.error('Runtime is not initialized')
  }

  process.distro = await getos()
  process.PROJECT_LOCATION = config.dataFolder

  const { start } = require('./runtime/app/bootstrap')

  runtime = await start(config)
  return runtime
}

try {
  require('dotenv').config({ path: path.resolve(process.PROJECT_LOCATION, '.env') })
  process.core_env = process.env as BotpressEnvironmentVariables

  let defaultVerbosity = process.IS_PRODUCTION ? 0 : 2
  if (!isNaN(Number(process.env.VERBOSITY_LEVEL))) {
    defaultVerbosity = Number(process.env.VERBOSITY_LEVEL)
  }

  process.IS_PRO_AVAILABLE = fs.existsSync(path.resolve(process.PROJECT_LOCATION, 'pro')) || !!process.pkg
  process.DISABLE_GLOBAL_SANDBOX = yn(process.env.DISABLE_GLOBAL_SANDBOX)
  process.DISABLE_BOT_SANDBOX = yn(process.env.DISABLE_BOT_SANDBOX)
  process.DISABLE_TRANSITION_SANDBOX = yn(process.env.DISABLE_TRANSITION_SANDBOX)
  process.DISABLE_CONTENT_SANDBOX = yn(process.env.DISABLE_CONTENT_SANDBOX)
  process.IS_LICENSED = true
  process.ASSERT_LICENSED = () => {}
  process.BPFS_STORAGE = process.core_env.BPFS_STORAGE || 'disk'

  const configPath = path.join(process.PROJECT_LOCATION, '/data/global/botpress.config.json')

  // We can't move this in bootstrap because process.IS_PRO_ENABLED is necessary for other than default CLI command
  if (process.IS_PRO_AVAILABLE) {
    process.CLUSTER_ENABLED = yn(process.env.CLUSTER_ENABLED)

    if (process.env.PRO_ENABLED === undefined && process.env.BP_CONFIG_PRO_ENABLED === undefined) {
      if (fs.existsSync(configPath)) {
        const config = require(configPath)
        process.IS_PRO_ENABLED = config.pro && config.pro.enabled
      }
    } else {
      process.IS_PRO_ENABLED = yn(process.env.PRO_ENABLED) || yn(process.env.BP_CONFIG_PRO_ENABLED)
    }
  }

  process.IS_PRODUCTION = yn(process.env.BP_PRODUCTION) || yn(process.env.CLUSTER_ENABLED)
  process.VERBOSITY_LEVEL = defaultVerbosity
} catch (err) {
  global.printErrorDefault(err)
}
