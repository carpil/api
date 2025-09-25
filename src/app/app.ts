import express from 'express'
import routes from '../routes'
import { loadEnv } from '../config/env'
import { requestLogger } from '../middlewares/logging.middleware'
import { errorHandler } from '../middlewares/error.middleware'

export const createApp = () => {
  loadEnv()
  const app = express()
  app.use(express.json())
  app.use(requestLogger)

  app.get('/', (_req, res) => { res.send('Welcome to Carpil') })
  app.use('/api', routes)

  app.use(errorHandler)
  return app
}


