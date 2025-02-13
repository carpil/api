import { authenticate } from '@middlewares/auth.middleware'
import { Ride } from '@models/ride'
import { RideRequest } from '@models/ride-request'
import { User } from '@models/user'
import { firestore } from 'config/firebase'
import express from 'express'

const app = express()
app.use(express.json())

const PORT = 8080

app.get('/', async (_req, res) => {
  res.send('Welcome to Carpil')
})

app.get('/rides/drivers', async (_req, res) => {
  const driverRidesSnapshot = await firestore
    .collection('rides')
    .get()

  const rides: Ride[] = driverRidesSnapshot.docs.map((doc) => {
    const ride = doc.data() as Ride
    ride.departureDate = doc.data().departureDate.toDate()
    return ride
  })
  res.json({ rides })
})

app.get('/rides/passengers', async (_req, res) => {
  const passengerRidesSnapshot = await firestore
    .collection('ride_requests')
    .get()

  const rides: RideRequest[] = passengerRidesSnapshot.docs.map((doc) => {
    const ride = doc.data() as RideRequest
    ride.deletedAt = doc.data().deletedAt?.toDate()
    ride.departureDate = doc.data().departureDate.toDate()
    return ride
  })

  res.json({ rides })
})

app.get('/users/:id', authenticate, async (_req, res) => {
  const userId = _req.params.id

  const userRef = await firestore.collection('users').doc(userId).get()
  if (!userRef.exists) {
    res.status(404).json({ message: 'User not found' })
    return
  }
  const user = userRef.data() as User
  res.json({ user })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
