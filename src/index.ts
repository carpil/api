import express from 'express'
import dotenv from 'dotenv'

import { authenticate, AuthRequest } from '@middlewares/auth.middleware'
import { firestore } from 'config/firebase'
import { Ride } from '@models/ride'
import { RideRequest } from '@models/ride-request'
import { User } from '@models/user'
import { UserInfo } from '@models/user-info'
import { validateRide } from 'schemas/ride'
import { FieldValue } from 'firebase-admin/firestore'

dotenv.config()

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 8080

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const MAX_RIDES_PER_HOUR = 5
const MAX_ACTIVE_RIDES = 2

// In-memory rate limiting store (consider using Redis for production)
const rateLimitStore = new Map<string, { count: number, timestamp: number }>()

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

app.get('/rides/drivers/:id', authenticate, async (req, res) => {
  const rideId = req.params.id

  const rideRef = await firestore.collection('rides').doc(rideId).get()
  if (!rideRef.exists) {
    res.status(404).json({ message: 'Ride not found' })
    return
  }

  const rideData = rideRef.data()
  const ride: Ride = {
    id: rideRef.id,
    origin: rideData?.origin ?? null,
    destination: rideData?.destination ?? null,
    meetingPoint: rideData?.meetingPoint ?? null,
    availableSeats: rideData?.availableSeats ?? 0,
    price: rideData?.price ?? 0,
    passengers: rideData?.passengers ?? [],
    driver: rideData?.driver ?? null,
    chatId: '',
    departureDate: rideData?.departureDate?.toDate() ?? null,
    deletedAt: rideData?.deletedAt?.toDate() ?? null,
    createdAt: rideData?.createdAt?.toDate() ?? null,
    updatedAt: rideData?.updatedAt?.toDate() ?? null
  }

  res.json({ ride })
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

app.post('/rides', authenticate, async (req: AuthRequest, res) => {
  const rideRequest = validateRide(req.body)
  if (!rideRequest.success) {
    res.status(400).json({ message: rideRequest.error.message })
    return
  }

  // get driver user info
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  // Check rate limiting
  const now = Date.now()
  const userRateLimit = rateLimitStore.get(currentUserId)

  if (userRateLimit != null) {
    if (now - userRateLimit.timestamp > RATE_LIMIT_WINDOW) {
      // Reset if window has passed
      rateLimitStore.set(currentUserId, { count: 1, timestamp: now })
    } else if (userRateLimit.count >= MAX_RIDES_PER_HOUR) {
      res.status(429).json({
        message: 'Rate limit exceeded. Please wait before creating more rides.',
        retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - userRateLimit.timestamp)) / 1000)
      })
      return
    } else {
      // Increment count
      userRateLimit.count++
    }
  } else {
    // First request in the window
    rateLimitStore.set(currentUserId, { count: 1, timestamp: now })
  }

  // Check active rides
  const activeRidesSnapshot = await firestore
    .collection('rides')
    .where('driver.id', '==', currentUserId)
    .where('status', '==', 'active')
    .where('deletedAt', '==', null)
    .get()

  if (activeRidesSnapshot.size >= MAX_ACTIVE_RIDES) {
    res.status(400).json({
      message: `You cannot have more than ${MAX_ACTIVE_RIDES} active rides at the same time.`
    })
    return
  }

  const driverUserRef = await firestore.collection('users').doc(currentUserId).get()
  if (!driverUserRef.exists) {
    res.status(404).json({ message: 'Driver not found' })
    return
  }

  const driverUser = driverUserRef.data() as User
  const driverUserInfo: UserInfo = {
    id: driverUser.id,
    name: driverUser.name,
    profilePicture: driverUser.profilePicture
  }

  let ride: Ride = {
    ...rideRequest.data,
    driver: driverUserInfo,
    deletedAt: null,
    status: 'active',
    chatId: '',
    passengers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // save ride to firestore
  const rideRef = firestore.collection('rides').doc()
  ride = {
    ...ride,
    id: rideRef.id
  }
  const result = await rideRef.set(ride)
  if (result.writeTime == null) {
    res.status(500).json({ message: 'Failed to save ride' })
    return
  }

  res.json({ ride })
})

app.post('/rides/:id/join', authenticate, async (req: AuthRequest, res) => {
  const rideId = req.params.id

  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const rideRef = await firestore.collection('rides').doc(rideId).get()
  if (!rideRef.exists) {
    res.status(404).json({ message: 'Ride not found' })
    return
  }

  const ride = rideRef.data() as Ride
  if (ride.driver.id === currentUserId) {
    res.status(400).json({ message: 'You cannot join your own ride' })
    return
  }

  if (ride.status !== 'active') {
    res.status(400).json({ message: 'Ride is not active' })
    return
  }

  if (ride.availableSeats <= 0) {
    res.status(400).json({ message: 'No available seats' })
    return
  }

  if (ride.passengers.some((passenger) => passenger.id === currentUserId)) {
    res.status(400).json({ message: 'You are already a passenger on this ride' })
    return
  }

  const passengerUserRef = await firestore.collection('users').doc(currentUserId).get()
  if (!passengerUserRef.exists) {
    res.status(404).json({ message: 'Passenger not found' })
    return
  }

  const passengerUser = passengerUserRef.data() as User
  const passengerUserInfo: UserInfo = {
    id: passengerUser.id,
    name: passengerUser.name,
    profilePicture: passengerUser.profilePicture
  }

  // Update ride's passenger list
  await firestore.collection('rides').doc(rideId).update({
    passengers: FieldValue.arrayUnion(passengerUserInfo),
    availableSeats: ride.availableSeats - 1,
    updatedAt: new Date()
  })

  res.json({ message: 'Successfully joined the ride' })
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
