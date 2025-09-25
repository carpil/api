import { loadEnv } from './config/env'
import { createApp } from './app/app'

loadEnv()

const app = createApp()
const port = process.env.PORT ?? 8080

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
