import * as sdk from 'botpress/sdk'
import { ObjectCache } from 'common/object-cache'
import { ActionScope } from 'common/typings'
import { GhostService } from 'core/bpfs'
import { addErrorToEvent, addStepToEvent, StepScopes, StepStatus } from 'core/events'
import { UntrustedSandbox } from 'core/misc/code-sandbox'
import { printObject } from 'core/misc/print'
import { clearRequireCache, requireAtPaths } from 'core/modules'
import { TYPES } from 'core/types'
import { inject, injectable, tagged } from 'inversify'
import _ from 'lodash'
import ms from 'ms'
import path from 'path'
import { NodeVM } from 'vm2'

import { filterDisabled, getBaseLookupPaths, runOutsideVm } from './utils'
import { VmRunner } from './vm'

const debug = DEBUG('hooks')
const DEBOUNCE_DELAY = ms('2s')

interface HookOptions {
  timeout: number
  throwOnError?: boolean
}

const debugInstances: { [hookType: string]: IDebugInstance } = {}
const defaultHookOptions = Object.freeze({ timeout: 1000, throwOnError: false })

export namespace Hooks {
  export class BaseHook {
    debug: IDebugInstance

    constructor(public folder: string, public args: any, public options: HookOptions = defaultHookOptions) {
      if (debugInstances[folder]) {
        this.debug = debugInstances[folder]
      } else {
        this.debug = debugInstances[folder] = debug.sub(folder)
      }
    }
  }

  export class AfterServerStart extends BaseHook {
    constructor(private bp: typeof sdk) {
      super('after_server_start', { bp })
    }
  }

  export class OnIncidentStatusChanged extends BaseHook {
    constructor(bp: typeof sdk, incident: sdk.Incident) {
      super('on_incident_status_changed', { bp, incident })
    }
  }

  export class BeforeBotImport extends BaseHook {
    constructor(bp: typeof sdk, botId: string, tmpFolder: string, hookResult: object) {
      super('before_bot_import', { bp, botId, tmpFolder, hookResult })
    }
  }

  export class OnStageChangeRequest extends BaseHook {
    constructor(
      bp: typeof sdk,
      bot: sdk.BotConfig,
      users: sdk.WorkspaceUserWithAttributes[],
      pipeline: sdk.Pipeline,
      hookResult: any
    ) {
      super('on_stage_request', { bp, bot, users, pipeline, hookResult }, { ...defaultHookOptions, throwOnError: true })
    }
  }

  export class AfterStageChanged extends BaseHook {
    constructor(
      bp: typeof sdk,
      previousBotConfig: sdk.BotConfig,
      bot: sdk.BotConfig,
      users: sdk.WorkspaceUserWithAttributes[],
      pipeline: sdk.Pipeline
    ) {
      super('after_stage_changed', { bp, previousBotConfig, bot, users, pipeline })
    }
  }
}

class HookScript {
  constructor(public path: string, public filename: string, public code: string, public name: string) {}
}

@injectable()
export class HookService {
  private _scriptsCache: Map<string, HookScript[]> = new Map()
  private _invalidateDebounce: ReturnType<typeof _.debounce>

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'HookService')
    private logger: sdk.Logger,
    @inject(TYPES.GhostService) private ghost: GhostService,
    @inject(TYPES.ObjectCache) private cache: ObjectCache
  ) {
    this._listenForCacheInvalidation()
    this._invalidateDebounce = _.debounce(this._invalidateRequire, DEBOUNCE_DELAY, { leading: true, trailing: false })
  }

  private _listenForCacheInvalidation() {
    this.cache.events.on('invalidation', key => {
      if (key.toLowerCase().indexOf('/hooks/') > -1 || key.toLowerCase().indexOf('/libraries') > -1) {
        // clear the cache if there's any file that has changed in the `hooks` folder
        this._scriptsCache.clear()
        this._invalidateDebounce()
      }
    })
  }

  private _invalidateRequire() {
    Object.keys(require.cache)
      .filter(r => r.match(/(\\|\/)(hooks|shared_libs|libraries)(\\|\/)/g))
      .map(file => delete require.cache[file])

    clearRequireCache()
  }

  async executeHook(hook: Hooks.BaseHook): Promise<void> {
    const scripts = await this.extractScripts(hook)
    await Promise.mapSeries(_.orderBy(scripts, ['filename'], ['asc']), script => this.runScript(script, hook))
  }

  async disableHook(hookName: string, hookType: string, moduleName?: string): Promise<boolean> {
    try {
      const rootPath = moduleName ? `/hooks/${hookType}/${moduleName}/` : `/hooks/${hookType}/`
      await this.ghost.global().renameFile(rootPath, `${hookName}.js`, `.${hookName}.js`)
      return true
    } catch (error) {
      // if the hook was already disabled or not found
      return false
    }
  }

  async enableHook(hookName: string, hookType: string, moduleName?: string): Promise<boolean> {
    try {
      const rootPath = moduleName ? `/hooks/${hookType}/${moduleName}/` : `/hooks/${hookType}/`
      await this.ghost.global().renameFile(rootPath, `.${hookName}.js`, `${hookName}.js`)
      return true
    } catch (error) {
      // if the hook was already enabled (or not found)
      return false
    }
  }

  private async extractScripts(hook: Hooks.BaseHook): Promise<HookScript[]> {
    const scriptKey = hook.folder

    if (this._scriptsCache.has(scriptKey)) {
      return this._scriptsCache.get(scriptKey)!
    }

    try {
      const globalHooks = filterDisabled(await this.ghost.global().directoryListing(`hooks/${hook.folder}`, '*.js'))
      const scripts: HookScript[] = await Promise.map(globalHooks, async path => this._getHookScript(hook.folder, path))

      this._scriptsCache.set(scriptKey, scripts)
      return scripts
    } catch (err) {
      this._scriptsCache.delete(scriptKey)
      return []
    }
  }

  private async _getHookScript(hookFolder: string, path: string) {
    const script = await this.ghost.global().readFileAsString(`hooks/${hookFolder}`, path)

    const filename = path.replace(/^.*[\\\/]/, '')
    return new HookScript(path, filename, script, filename.replace('.js', ''))
  }

  private _prepareRequire(fullPath: string, hookType: string) {
    const lookups = getBaseLookupPaths(fullPath, hookType)

    return (module: string) => requireAtPaths(module, lookups, fullPath)
  }

  private async runScript(hookScript: HookScript, hook: Hooks.BaseHook) {
    const hookPath = `/data/global/hooks/${hook.folder}/${hookScript.path}.js`

    const dirPath = path.resolve(path.join(process.PROJECT_LOCATION, hookPath))

    const _require = this._prepareRequire(dirPath, hook.folder)

    hook.debug('before execute %o', { path: hookScript.path, args: _.omit(hook.args, ['bp']) })

    if (runOutsideVm('global')) {
      await this.runWithoutVm(hookScript, hook, _require)
    } else {
      await this.runInVm(hookScript, hook, _require)
    }
  }

  private async runWithoutVm(hookScript: HookScript, hook: Hooks.BaseHook, _require: Function) {
    const args = {
      ...hook.args,
      process: UntrustedSandbox.getSandboxProcessArgs(),
      printObject,
      require: _require
    }

    try {
      const fn = new Function(...Object.keys(args), hookScript.code)
      await fn(...Object.values(args))
      return
    } catch (err) {
      this.logScriptError(err, hookScript.path, hook.folder)
    }
  }

  private async runInVm(hookScript: HookScript, hook: Hooks.BaseHook, _require: Function) {
    const modRequire = new Proxy(
      {},
      {
        get: (_obj, prop) => _require(prop)
      }
    )

    const vm = new NodeVM({
      wrapper: 'none',
      console: 'inherit',
      sandbox: {
        ...hook.args,
        process: UntrustedSandbox.getSandboxProcessArgs(),
        printObject
      },
      timeout: hook.options.timeout,
      require: {
        external: true,
        mock: modRequire
      }
    })

    const vmRunner = new VmRunner()

    await vmRunner.runInVm(vm, hookScript.code, hookScript.path).catch(err => {
      this.logScriptError(err, hookScript.path, hook.folder)

      if (hook.options.throwOnError) {
        throw err
      }
    })
  }

  private logScriptError(err: Error, path: string, folder: string) {
    const message = `An error occurred on "${path}" on "${folder}". ${err}`
    this.logger.attachError(err).error(message)
  }
}
