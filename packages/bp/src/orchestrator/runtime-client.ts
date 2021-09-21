import axios, { AxiosInstance } from 'axios'
import sdk from 'botpress/sdk'
import { ChildProcess, fork, spawn } from 'child_process'
import fse from 'fs-extra'
import _ from 'lodash'
import { getUnusedPort, MessageType, onProcessExit, processes, registerMsgHandler, registerProcess } from 'orchestrator'

import path from 'path'

export interface RuntimeParams {
  EXTERNAL_URL: string
  APP_SECRET: string
  ROOT_PATH: string
  CORE_PORT: string
  PRO_ENABLED: string
}

let initialParams: any

const debug = DEBUG('orchestrator:studio')

interface RuntimeClients {
  client?: AxiosInstance
  port?: number
  id: number
}

interface RuntimeInternal {
  handle?: ChildProcess
  id: number
}

/**
 * [PROCESS: WEB_WORKER]
 */
let runtimesClient: RuntimeClients[] = []

export const initRuntimeClient = (port: number, runtimeId: number) => {
  runtimesClient.push({
    id: runtimeId,
    port,
    client: axios.create({
      headers: { authorization: process.INTERNAL_PASSWORD },
      baseURL: `http://localhost:${port}/api/internal`
    })
  })
}

export const removeRuntimeClient = (runtimeId: number) => {
  runtimesClient = runtimesClient.filter(x => x.id !== runtimeId)
}

export const runtimeActions = {
  sendIncoming: async payload => {
    const rnd = _.random(0, runtimesClient.length - 1, false)
    await runtimesClient[rnd]?.client?.post('/sendEvent', payload)
  }
}

/**
 * [PROCESS: RUNTIME]
 */
let coreClient: AxiosInstance | undefined

export const requestRuntimeStartup = (webWorkerPort: number) => {
  process.send!({
    type: MessageType.StartRuntime,
    params: {
      EXTERNAL_URL: process.EXTERNAL_URL,
      ROOT_PATH: process.ROOT_PATH,
      APP_SECRET: process.APP_SECRET,
      CORE_PORT: webWorkerPort,
      PRO_ENABLED: process.IS_PRO_ENABLED?.toString()
    }
  })
}

export const setupRuntimeWorker = () => {
  process.SERVER_ID = process.env.SERVER_ID!
  process.INTERNAL_PASSWORD = process.env.INTERNAL_PASSWORD!

  coreClient = axios.create({
    headers: { authorization: process.INTERNAL_PASSWORD },
    baseURL: `http://localhost:${process.env.CORE_PORT}/api/internal`
  })

  process.BOTPRESS_EVENTS.onAny((event, args) => {
    coreActions.emitBotpressEvent({ event, args })
  })
}

export const coreActions = {
  sendOutgoing: async payload => {
    await coreClient?.post('/sendEvent', payload)
  },
  emitBotpressEvent: payload => {
    void coreClient?.post('/emitBotpressEvent', payload)
  }
}

/**
 * [PROCESS: MASTER]
 */
const runtimes: RuntimeInternal[] = []
let currentId = 1
let runtimeStarting

export const registerRuntimeMainHandler = (logger: sdk.Logger) => {
  registerMsgHandler(MessageType.StartRuntime, async message => {
    if (runtimeStarting) {
      await runtimeStarting
    }

    runtimeStarting = new Promise(async resolve => {
      await startRuntime(logger, message.params)
      resolve()
    })
  })
}

export const startRuntime = async (logger: sdk.Logger, params: RuntimeParams) => {
  const runtimeId = currentId++
  const runtimePort = await getUnusedPort(3000)

  runtimes.push({ id: runtimeId })

  registerProcess('runtime', runtimePort, runtimeId)

  const env: any = {
    // The node path is set by PKG, but other env variables are required (eg: for colors)
    ..._.omit(process.env, ['NODE_PATH']),
    NODE_OPTIONS: '',
    PROJECT_LOCATION: process.PROJECT_LOCATION,
    APP_DATA_PATH: process.APP_DATA_PATH,
    PRO_ENABLED: params.PRO_ENABLED,
    CORE_PORT: processes.web.port.toString(),
    INTERNAL_PASSWORD: process.INTERNAL_PASSWORD,
    BP_DATA_FOLDER: path.join(process.PROJECT_LOCATION, 'data'),
    EXTERNAL_URL: params.EXTERNAL_URL,
    APP_SECRET: params.APP_SECRET,
    ROOT_PATH: params.ROOT_PATH,
    PORT: runtimePort,
    SERVER_ID: process.SERVER_ID,
    BOTPRESS_VERSION: process.BOTPRESS_VERSION,
    RUNTIME_ID: runtimeId,
    IS_RUNTIME: true
  }

  initialParams = params

  let handle: ChildProcess | undefined
  if (process.pkg || !process.env.DEV_RUNTIME_PATH) {
    const basePath = process.pkg ? path.dirname(process.execPath) : path.resolve(__dirname, '../')
    const file = path.resolve(basePath, `bin/studio${process.distro.os === 'win32' ? '.exe' : ''}`)

    if (!(await fse.pathExists(file))) {
      logger.warn('Runtime executable not found.')
      return
    }

    handle = spawn(file, [], { env, stdio: 'inherit' })
  } else if (process.env.DEV_RUNTIME_PATH) {
    const file = path.resolve(process.env.DEV_RUNTIME_PATH, 'index.js')
    handle = fork(file, undefined, { execArgv: [], env, cwd: path.dirname(file) })
  }

  if (handle) {
    handle.on('exit', async (code: number, signal: string) => {
      debug('Runtime exiting %o', { code, signal })

      onProcessExit({
        processType: 'runtime',
        workerId: runtimeId,
        code,
        signal,
        logger,
        restartMethod: async () => {
          await startRuntime(logger, initialParams)
        }
      })
    })

    const runtime = runtimes.find(x => x.id === runtimeId)
    if (runtime) {
      runtime.handle = handle
    }
  }
}
