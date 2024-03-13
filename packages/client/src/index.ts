import axios from 'axios'
import { isNode } from 'browser-or-node'
import http from 'http'
import https from 'https'
import { getClientConfig, ClientProps, ClientConfig } from './config'
import { ApiClient as AutoGeneratedClient } from './gen/client'
export { isApiError } from './gen/errors'

export * as axios from 'axios'
export type {
  Message,
  Conversation,
  User,
  State,
  Event,
  ModelFile as File,
  Bot,
  Integration,
  Issue,
  IssueEvent,
  Account,
  Workspace,
  Usage,
} from './gen'
export * from './gen/errors'

const _100mb = 100 * 1024 * 1024
const maxBodyLength = _100mb
const maxContentLength = _100mb

export class Client extends AutoGeneratedClient {
  public readonly config: Readonly<ClientConfig>

  public constructor(clientProps: ClientProps = {}) {
    const clientConfig = getClientConfig(clientProps)
    const { apiUrl, headers, withCredentials, timeout } = clientConfig

    const axiosClient = axios.create({
      headers,
      withCredentials,
      timeout,
      maxBodyLength,
      maxContentLength,
      httpAgent: isNode ? new http.Agent({ keepAlive: true }) : undefined,
      httpsAgent: isNode ? new https.Agent({ keepAlive: true }) : undefined,
    })

    super(undefined, apiUrl, axiosClient)

    this.config = clientConfig
  }
}

type Simplify<T> = { [KeyType in keyof T]: Simplify<T[KeyType]> } & {}

type PickMatching<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] }
type ExtractMethods<T> = PickMatching<T, (...rest: any[]) => any>

type FunctionNames = keyof ExtractMethods<Client>

export type ClientParams<T extends FunctionNames> = Simplify<Parameters<Client[T]>[0]>
export type ClientReturn<T extends FunctionNames> = Simplify<Awaited<ReturnType<Client[T]>>>
