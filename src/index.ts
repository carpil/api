import express from 'express'

const app = express()
app.use(express.json())

const PORT = 3000

app.get('/', (_req, res) => {
  console.log('here')
  res.send('Welcome to Carpil')
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
