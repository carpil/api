import { createApp } from './app/app'

const app = createApp()
const port = process.env.PORT ?? 8080

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
