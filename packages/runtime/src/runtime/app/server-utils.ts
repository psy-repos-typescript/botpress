import { Request } from 'express-serve-static-core'
import fs from 'fs'
import _ from 'lodash'
import path from 'path'

const debug = DEBUG('api')
const debugRequest = debug.sub('request')

export const debugRequestMw = (req: Request, _res, next) => {
  debugRequest(`${req.path} %o`, {
    method: req.method,
    ip: req.ip,
    originalUrl: req.originalUrl
  })

  next()
}
