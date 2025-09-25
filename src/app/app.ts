import express from 'express'
import routes from '../routes'
import { requestLogger } from '../middlewares/logging.middleware'
import { errorHandler } from '../middlewares/error.middleware'

export const createApp = () => {
  const app = express()
  app.use(express.json())
  app.use(requestLogger)

  app.get('/', (_req, res) => { res.send('Welcome to Carpil') })
  app.use('/', routes)

  app.use(errorHandler)
  return app
}


