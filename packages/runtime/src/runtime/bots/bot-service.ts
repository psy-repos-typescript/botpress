import { BotConfig, Logger } from 'botpress/sdk'
import { extractArchive } from 'common/archive'
import { BotHealth, ServerHealth } from 'common/typings'
import { inject, injectable, postConstruct, tagged } from 'inversify'
import _ from 'lodash'
import ms from 'ms'
import os from 'os'
import path from 'path'
import { createForGlobalHooks } from 'runtime/app/api'
import { TYPES } from 'runtime/app/types'
import { GhostService } from 'runtime/bpfs'
import { CMSService } from 'runtime/cms'
import { ConfigProvider } from 'runtime/config'
import { JobService, makeRedisKey } from 'runtime/distributed'
import { Hooks, HookService } from 'runtime/user-code'
import { ComponentService } from './component-service'

const BOT_CONFIG_FILENAME = 'bot.config.json'

const STATUS_REFRESH_INTERVAL = ms('15s')
const STATUS_EXPIRY = ms('20s')
const DEFAULT_BOT_HEALTH: BotHealth = { status: 'disabled', errorCount: 0, warningCount: 0, criticalCount: 0 }

const getBotStatusKey = (serverId: string) => makeRedisKey(`bp_server_${serverId}_bots`)
const debug = DEBUG('services:bots')

@injectable()
export class BotService {
  private _botIds: string[] | undefined
  private static _mountedBots: Map<string, boolean> = new Map()
  private static _botHealth: { [botId: string]: BotHealth } = {}
  private _updateBotHealthDebounce = _.debounce(this._updateBotHealth, 500)
  private componentService: ComponentService

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'BotService')
    private logger: Logger,
    @inject(TYPES.ConfigProvider) private configProvider: ConfigProvider,
    @inject(TYPES.CMSService) private cms: CMSService,
    @inject(TYPES.GhostService) private ghostService: GhostService,
    @inject(TYPES.HookService) private hookService: HookService,
    @inject(TYPES.JobService) private jobService: JobService
  ) {
    this._botIds = undefined
    this.componentService = new ComponentService(this.logger, this.ghostService, this.cms)
  }

  @postConstruct()
  async init() {
    setInterval(() => this._updateBotHealthDebounce(), STATUS_REFRESH_INTERVAL)
  }

  getBotWorkspaceId(botId: string) {
    return 'default'
  }

  async findBotById(botId: string): Promise<BotConfig | undefined> {
    if (!(await this.ghostService.forBot(botId).fileExists('/', 'bot.config.json'))) {
      this.logger.forBot(botId).warn(`Bot "${botId}" not found. Make sure it exists on your filesystem or database.`)
      return
    }

    return this.configProvider.getBotConfig(botId)
  }

  async findBotsByIds(botsIds: string[]): Promise<BotConfig[]> {
    const actualBotsIds = await this.getBotsIds()
    const unlinkedBots = _.difference(actualBotsIds, botsIds)
    const linkedBots = _.without(actualBotsIds, ...unlinkedBots)
    const botConfigs: BotConfig[] = []

    for (const botId of linkedBots) {
      const config = await this.findBotById(botId)
      config && botConfigs.push(config)
    }

    return botConfigs
  }

  async getBots(): Promise<Map<string, BotConfig>> {
    const botIds = await this.getBotsIds()
    const bots = new Map<string, BotConfig>()

    for (const botId of botIds) {
      try {
        const bot = await this.findBotById(botId)
        bot && bots.set(botId, bot)
      } catch (err) {
        this.logger
          .forBot(botId)
          .attachError(err)
          .error(`Bot configuration file not found for bot "${botId}"`)
      }
    }

    return bots
  }

  async getBotsIds(ignoreCache?: boolean): Promise<string[]> {
    if (!this._botIds || ignoreCache) {
      this._botIds = (await this.ghostService.bots().directoryListing('/', BOT_CONFIG_FILENAME)).map(path.dirname)
    }

    return this._botIds
  }

  public async botExists(botId: string, ignoreCache?: boolean): Promise<boolean> {
    return (await this.getBotsIds(ignoreCache)).includes(botId)
  }

  public isBotMounted(botId: string): boolean {
    return BotService._mountedBots.get(botId) || false
  }

  private async _localSyncLibs(botId: string, serverId: string) {
    // We do not need to extract the archive on the server which just generated it
    if (process.SERVER_ID !== serverId) {
      await this._extractBotNodeModules(botId)
    }
  }

  private async _extractBotNodeModules(botId: string) {
    const bpfs = this.ghostService.forBot(botId)
    if (!(await bpfs.fileExists('libraries', 'node_modules.tgz'))) {
      return
    }

    try {
      const archive = await bpfs.readFileAsBuffer('libraries', 'node_modules.tgz')
      const destPath = path.join(process.PROJECT_LOCATION, 'data/bots', botId, 'libraries/node_modules')
      await extractArchive(archive, destPath)
    } catch (err) {
      this.logger.attachError(err).error('Error extracting node modules')
    }
  }

  private async _extractLibsToDisk(botId: string) {
    if (process.BPFS_STORAGE === 'disk') {
      return
    }

    await this.ghostService.forBot(botId).syncDatabaseFilesToDisk('libraries')
    await this.ghostService.forBot(botId).syncDatabaseFilesToDisk('actions')
    await this.ghostService.forBot(botId).syncDatabaseFilesToDisk('hooks')
  }

  public async mountBot(botId: string): Promise<boolean> {
    const startTime = Date.now()
    if (this.isBotMounted(botId)) {
      return true
    }

    if (!(await this.ghostService.forBot(botId).fileExists('/', 'bot.config.json'))) {
      this.logger
        .forBot(botId)
        .error(`Cannot mount bot "${botId}". Make sure it exists on the filesystem or the database.`)
      return false
    }

    try {
      const config = await this.configProvider.getBotConfig(botId)
      if (!config.languages.includes(config.defaultLanguage)) {
        throw new Error('Supported languages must include the default language of the bot')
      }

      await this.cms.loadContentTypesFromFiles(botId)
      await this.componentService.extractBotComponents(botId)

      await this.cms.loadElementsForBot(botId)

      await this._extractLibsToDisk(botId)
      await this._extractBotNodeModules(botId)

      const api = await createForGlobalHooks()
      await this.hookService.executeHook(new Hooks.AfterBotMount(api, botId))

      BotService._mountedBots.set(botId, true)

      this._invalidateBotIds()

      BotService.setBotStatus(botId, 'healthy')
      return true
    } catch (err) {
      this.logger
        .forBot(botId)
        .attachError(err)
        .critical(`Cannot mount bot "${botId}"`)

      return false
    } finally {
      await this._updateBotHealthDebounce()
      debug.forBot(botId, `Mount took ${Date.now() - startTime}ms`)
    }
  }

  // Do not use directly use the public version instead due to broadcasting
  public async unmountBot(botId: string) {
    const startTime = Date.now()
    if (!this.isBotMounted(botId)) {
      this._invalidateBotIds()
      return
    }

    await this.cms.clearElementsFromCache(botId)

    const api = await createForGlobalHooks()
    await this.hookService.executeHook(new Hooks.AfterBotUnmount(api, botId))

    BotService._mountedBots.set(botId, false)
    BotService.setBotStatus(botId, 'disabled')

    await this._updateBotHealthDebounce()
    this._invalidateBotIds()
    debug.forBot(botId, `Unmount took ${Date.now() - startTime}ms`)

    // Ensures cleanup since the emit was removed when executing hooks.
    process.BOTPRESS_EVENTS.emit('after_bot_unmount', { botId })
  }

  private _invalidateBotIds(): void {
    this._botIds = undefined
  }

  public static getMountedBots() {
    const bots: string[] = []
    BotService._mountedBots.forEach((isMounted, bot) => isMounted && bots.push(bot))
    return bots
  }

  private async _updateBotHealth(): Promise<void> {
    const botIds = await this.getBotsIds()

    Object.keys(BotService._botHealth)
      .filter(x => !botIds.includes(x))
      .forEach(id => delete BotService._botHealth[id])

    const redis = this.jobService.getRedisClient()
    if (redis) {
      const data = JSON.stringify({ serverId: process.SERVER_ID, hostname: os.hostname(), bots: BotService._botHealth })
      await redis.set(getBotStatusKey(process.SERVER_ID), data, 'PX', STATUS_EXPIRY)
    }
  }

  public async getBotHealth(): Promise<ServerHealth[]> {
    const redis = this.jobService.getRedisClient()
    if (!redis) {
      return [{ serverId: process.SERVER_ID, hostname: os.hostname(), bots: BotService._botHealth }]
    }

    const serverIds = await redis.keys(getBotStatusKey('*'))
    if (!serverIds.length) {
      return []
    }

    const servers = await redis.mget(...serverIds)
    return Promise.mapSeries(servers, data => JSON.parse(data as string))
  }

  public static incrementBotStats(botId: string, type: 'error' | 'warning' | 'critical') {
    if (!this._botHealth[botId]) {
      this._botHealth[botId] = DEFAULT_BOT_HEALTH
    }

    if (type === 'error') {
      this._botHealth[botId].errorCount++
    } else if (type === 'warning') {
      this._botHealth[botId].warningCount++
    } else if (type === 'critical') {
      this._botHealth[botId].criticalCount++
      this._botHealth[botId].status = 'unhealthy'
    }
  }

  public static setBotStatus(botId: string, status: 'healthy' | 'unhealthy' | 'disabled') {
    this._botHealth[botId] = {
      ...(this._botHealth[botId] || DEFAULT_BOT_HEALTH),
      status
    }

    if (['disabled'].includes(status)) {
      this._botHealth[botId].errorCount = 0
      this._botHealth[botId].warningCount = 0
      this._botHealth[botId].criticalCount = 0
    }
  }
}
