/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable simple-import-sort/imports */
/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  XrpcClient,
  type FetchHandler,
  type FetchHandlerOptions,
} from '@atproto/xrpc'
import { schemas } from './lexicons.js'
// import { CID } from 'multiformats/cid'
import { type OmitKey, type Un$Typed } from './util.js'
import * as AppReddwarfLabelmergeQueryLabels from './types/app/reddwarf/labelmerge/queryLabels.js'
import * as ComAtprotoLabelDefs from './types/com/atproto/label/defs.js'

export * as AppReddwarfLabelmergeQueryLabels from './types/app/reddwarf/labelmerge/queryLabels.js'
export * as ComAtprotoLabelDefs from './types/com/atproto/label/defs.js'

export class AtpBaseClient extends XrpcClient {
  app: AppNS

  constructor(options: FetchHandler | FetchHandlerOptions) {
    super(options, schemas)
    this.app = new AppNS(this)
  }

  /** @deprecated use `this` instead */
  get xrpc(): XrpcClient {
    return this
  }
}

export class AppNS {
  _client: XrpcClient
  reddwarf: AppReddwarfNS

  constructor(client: XrpcClient) {
    this._client = client
    this.reddwarf = new AppReddwarfNS(client)
  }
}

export class AppReddwarfNS {
  _client: XrpcClient
  labelmerge: AppReddwarfLabelmergeNS

  constructor(client: XrpcClient) {
    this._client = client
    this.labelmerge = new AppReddwarfLabelmergeNS(client)
  }
}

export class AppReddwarfLabelmergeNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  queryLabels(
    params?: AppReddwarfLabelmergeQueryLabels.QueryParams,
    opts?: AppReddwarfLabelmergeQueryLabels.CallOptions,
  ): Promise<AppReddwarfLabelmergeQueryLabels.Response> {
    return this._client.call(
      'app.reddwarf.labelmerge.queryLabels',
      params,
      undefined,
      opts,
    )
  }
}
