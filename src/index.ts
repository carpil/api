import express from 'express'
import dotenv from 'dotenv'

import { authenticate, AuthRequest } from '@middlewares/auth.middleware'
import { firestore } from 'config/firebase'
import { Ride, RideStatus } from '@models/ride'
import { RideRequest } from '@models/ride-request'
import { User } from '@models/user'
import { UserInfo } from '@models/user-info'
import { Chat, ChatResponse, Message } from '@models/chat'
import { validateRide } from 'schemas/ride'
import { FieldValue } from 'firebase-admin/firestore'
import { validateUser, validatePushToken } from 'schemas/user'
import { validateMessage } from 'schemas/message'
import { getRide } from '@utils/ride-utils'
import { decryptMessage, encryptMessage } from '@utils/message-utils'
import { Expo } from 'expo-server-sdk'
import { validateRating } from 'schemas/rating'
import { Rating } from '@models/rating'

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

const expo = new Expo()

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
    .where('status', '==', RideStatus.Active)
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
    status: RideStatus.Active,
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

  // Create chat for the ride
  const chatRef = firestore.collection('chats').doc()
  const chat: Chat = {
    id: chatRef.id,
    participants: [currentUserId],
    owner: currentUserId,
    rideId: rideRef.id,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  try {
    await chatRef.set(chat)
    console.debug('Chat created for ride:', { rideId: rideRef.id, chatId: chatRef.id, driverId: currentUserId })
  } catch (error) {
    console.error('Failed to create chat for ride:', { rideId: rideRef.id, error })
    // Don't fail the ride creation if chat creation fails
  }

  // Update ride with chat ID
  try {
    await firestore.collection('rides').doc(rideRef.id).update({
      chatId: chatRef.id
    })
    ride.chatId = chatRef.id
  } catch (error) {
    console.error('Failed to update ride with chat ID:', { rideId: rideRef.id, chatId: chatRef.id, error })
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

  if (ride.status !== RideStatus.Active) {
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
    updatedAt: new Date()
  })

  // Add passenger to the ride's chat
  if (ride.chatId) {
    try {
      await firestore.collection('chats').doc(ride.chatId).update({
        participants: FieldValue.arrayUnion(currentUserId),
        updatedAt: new Date()
      })
      console.debug('Passenger added to chat:', { rideId, chatId: ride.chatId, passengerId: currentUserId })
    } catch (error) {
      console.error('Failed to add passenger to chat:', { rideId, chatId: ride.chatId, passengerId: currentUserId, error })
      res.status(500).json({ message: 'Failed to add passenger to chat' })
      return
    }
  }

  res.json({ message: 'Successfully joined the ride' })
})

app.post('/rides/:id/start', authenticate, async (req: AuthRequest, res) => {
  const rideId = req.params.id

  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  try {
    // Fetch ride
    const rideDoc = await firestore.collection('rides').doc(rideId).get()
    if (!rideDoc.exists) {
      res.status(404).json({ message: 'Ride not found' })
      return
    }

    const ride = rideDoc.data() as Ride

    // Only driver can start the ride
    if (ride.driver.id !== currentUserId) {
      res.status(403).json({ message: 'Only the driver can start this ride' })
      return
    }

    // Ensure ride is in a state that can be started
    if (ride.status !== RideStatus.Active) {
      res.status(400).json({ message: 'Ride cannot be started in its current status' })
      return
    }

    // Update ride status to in_progress and updatedAt
    await rideDoc.ref.update({
      status: RideStatus.InProgress,
      updatedAt: new Date()
    })

  // Flag driver as inRide
    try {
      await firestore.collection('users').doc(currentUserId).update({
        inRide: {
          active: true,
          rideId,
          rideStartedAt: new Date(),
          pendingToReview: false
        },
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Failed to set driver inRide flag:', { rideId, driverId: currentUserId, error })
      // Not critical to block
    }

    // Update passengers inRide and notify them that the ride has started
    const passengers = Array.isArray(ride.passengers) ? ride.passengers : []
    const pushMessages: any[] = []

    for (const passenger of passengers) {
      try {
        // Update passenger inRide state
        await firestore.collection('users').doc(passenger.id).update({
          inRide: {
            active: true,
            rideId,
            rideStartedAt: new Date(),
            pendingToReview: false
          },
          updatedAt: new Date()
        })

        // Prepare push notifications
        const userSnapshot = await firestore.collection('users').doc(passenger.id).get()
        const userData = userSnapshot.data() as User | undefined

        const pushTokens = userData?.pushToken || []
        for (const pushToken of pushTokens) {
          if (Expo.isExpoPushToken(pushToken)) {
            pushMessages.push({
              to: pushToken,
              sound: 'default',
              title: 'Tu viaje ha iniciado',
              body: 'El conductor ha iniciado el viaje.',
              data: {
                rideId,
                driverId: currentUserId
              }
            })
          }
        }
      } catch (error) {
        console.error('Error updating passenger inRide or preparing push:', { passengerId: passenger.id, error })
      }
    }

    if (pushMessages.length > 0) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(pushMessages)
        console.debug('Ride start push notifications sent:', receipts)
      } catch (error) {
        console.error('Failed to send ride start push notifications:', error)
      }
    }

    res.json({ message: 'Ride started successfully' })
  } catch (error) {
    console.error('Error starting ride:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.post('/rides/:id/complete', authenticate, async (req: AuthRequest, res) => {
  const rideId = req.params.id

  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  try {
    // Fetch ride
    const rideDoc = await firestore.collection('rides').doc(rideId).get()
    if (!rideDoc.exists) {
      res.status(404).json({ message: 'Ride not found' })
      return
    }

    const ride = rideDoc.data() as Ride

    // Only driver can complete the ride
    if (ride.driver.id !== currentUserId) {
      res.status(403).json({ message: 'Only the driver can complete this ride' })
      return
    }

    // Ensure ride is in a state that can be completed
    if (ride.status !== RideStatus.InProgress && ride.status !== RideStatus.InRoute) {
      res.status(400).json({ message: 'Ride cannot be completed in its current status' })
      return
    }

    // Update ride status to completed and updatedAt
    await rideDoc.ref.update({
      status: RideStatus.Completed,
      updatedAt: new Date()
    })

    // Flag driver to normal mode and mark pending review (preserve rideStartedAt)
    try {
      const driverSnap = await firestore.collection('users').doc(currentUserId).get()
      const driverData = driverSnap.data() as User | undefined
      const existingStartedAt = (driverData as any)?.inRide?.rideStartedAt
        ? new Date((driverData as any).inRide.rideStartedAt)
        : new Date()

      await firestore.collection('users').doc(currentUserId).update({
        inRide: {
          active: false,
          rideId,
          rideStartedAt: existingStartedAt,
          pendingToReview: true
        },
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Failed to unset driver inRide flag:', { rideId, driverId: currentUserId, error })
      // Not critical to block
    }

    // Notify passengers and set their pendingToReview flags
    const passengers = Array.isArray(ride.passengers) ? ride.passengers : []
    const pushMessages: any[] = []

    for (const passenger of passengers) {
      try {
        // Read passenger to preserve original rideStartedAt and to get push tokens
        const userSnapshot = await firestore.collection('users').doc(passenger.id).get()
        const userData = userSnapshot.data() as User | undefined
        const existingStartedAt = (userData as any)?.inRide?.rideStartedAt
          ? new Date((userData as any).inRide.rideStartedAt)
          : new Date()

        // Update passenger flags
        await firestore.collection('users').doc(passenger.id).update({
          inRide: {
            active: false,
            rideId,
            rideStartedAt: existingStartedAt,
            pendingToReview: true
          },
          updatedAt: new Date()
        })

        // Prepare push
        const pushTokens = userData?.pushToken || []
        for (const pushToken of pushTokens) {
          if (Expo.isExpoPushToken(pushToken)) {
            pushMessages.push({
              to: pushToken,
              sound: 'default',
              title: 'Viaje completado',
              body: 'El conductor ha completado el viaje.',
              data: {
                rideId,
                driverId: currentUserId
              }
            })
          }
        }
      } catch (error) {
        console.error('Error updating passenger flags or preparing push:', { passengerId: passenger.id, error })
      }
    }

    if (pushMessages.length > 0) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(pushMessages)
        console.debug('Ride completion push notifications sent:', receipts)
      } catch (error) {
        console.error('Failed to send ride completion push notifications:', error)
      }
    }

    // TODO: Send money to driver

    res.json({ message: 'Ride completed successfully' })
  } catch (error) {
    console.error('Error completing ride:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
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

app.post('/signup', authenticate, async (req: AuthRequest, res) => {
  const userRequest = validateUser(req.body)
  if (!userRequest.success) {
    res.status(400).json({ message: userRequest.error.message })
    return
  }

  const currentUserId = req.user?.uid
  if (currentUserId == null ||userRequest.data.id !== currentUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const currentUserEmail = req.user?.email
  if (currentUserEmail == null || currentUserEmail !== userRequest.data.email) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const userRef = await firestore.collection('users').doc(currentUserId).get()
  if (userRef.exists) {
    res.status(400).json({ message: 'User already exists' })
    return
  }

  const userToSave: User = {
    ...userRequest.data,
    id: currentUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  }


  const result = await firestore.collection('users').doc(currentUserId).set(userToSave)
  if (result.writeTime == null) {
    res.status(500).json({ message: 'Failed to save user' })
    return
  }

  res.json({ message: 'User created successfully', user: userToSave })
})

app.post('/login', authenticate, async (req: AuthRequest, res) => {
  const userRequest = validateUser(req.body)
  if (!userRequest.success) {
    res.status(400).json({ message: userRequest.error.message })
    return
  }
  
  const currentUserId = req.user?.uid
  if (currentUserId == null ||userRequest.data.id !== currentUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const currentUserEmail = req.user?.email
  if (currentUserEmail == null || currentUserEmail !== userRequest.data.email) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const userRef = await firestore.collection('users').doc(currentUserId).get()
  if (!userRef.exists) {
    res.status(404).json({ message: 'User not found' })
    return
  }

  const user: User = {
    ...userRef.data() as User,
    id: currentUserId,
    createdAt: userRef.data()?.createdAt?.toDate() ?? new Date(),
    updatedAt: userRef.data()?.updatedAt?.toDate() ?? new Date()
  }

  res.json({ message: 'User logged in successfully', user })
})

app.post('/login/social', authenticate, async (req: AuthRequest, res) => {
    const userRequest = validateUser(req.body)
  if (!userRequest.success) {
    res.status(400).json({ message: userRequest.error.message })
    return
  }
  
  const currentUserId = req.user?.uid
  if (currentUserId == null ||userRequest.data.id !== currentUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const currentUserEmail = req.user?.email
  if (currentUserEmail == null || currentUserEmail !== userRequest.data.email) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  // check if user exists
  const userRef = await firestore.collection('users').doc(currentUserId).get()
  if (!userRef.exists) {
    // create user
    const userToSave: User = {
      ...userRequest.data,
      id: currentUserId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await firestore.collection('users').doc(currentUserId).set(userToSave)
    if (result.writeTime == null) {
      res.status(500).json({ message: 'Failed to save user' })
      return
    }

    res.json({ message: 'User created successfully', user: userToSave })
    return
  }

  const user: User = {
    ...userRef.data() as User,
    id: currentUserId,
    createdAt: userRef.data()?.createdAt?.toDate() ?? new Date(),
    updatedAt: userRef.data()?.updatedAt?.toDate() ?? new Date()
  }

  res.json({ message: 'User logged in successfully', user })
  return
})

app.post('/notifications/token', authenticate, async (req: AuthRequest, res) => {
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pushTokenRequest = validatePushToken(req.body)
  if (!pushTokenRequest.success) {
    res.status(400).json({ message: pushTokenRequest.error.message })
    return
  }

  const { pushToken } = pushTokenRequest.data

  try {
    // Check if user exists
    const userRef = await firestore.collection('users').doc(currentUserId).get()
    if (!userRef.exists) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    const userData = userRef.data() as User
    const currentPushTokens = userData.pushToken || []

    // Add the new token if it doesn't already exist
    if (!currentPushTokens.includes(pushToken)) {
      await firestore.collection('users').doc(currentUserId).update({
        pushToken: FieldValue.arrayUnion(pushToken),
        updatedAt: new Date()
      })
    }

    res.json({ 
      message: 'Push token updated successfully',
      pushToken
    })
  } catch (error) {
    console.error('Error updating push token:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.post('/notifications/token/remove', authenticate, async (req: AuthRequest, res) => {
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pushTokenRequest = validatePushToken(req.body)
  if (!pushTokenRequest.success) {
    res.status(400).json({ message: pushTokenRequest.error.message })
    return
  }

  const { pushToken } = pushTokenRequest.data

  try {
    // Check if user exists
    const userRef = await firestore.collection('users').doc(currentUserId).get()
    if (!userRef.exists) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    const userData = userRef.data() as User
    const currentPushTokens = userData.pushToken || []

    // Remove the token if it exists
    if (currentPushTokens.includes(pushToken)) {
      await firestore.collection('users').doc(currentUserId).update({
        pushToken: FieldValue.arrayRemove(pushToken),
        updatedAt: new Date()
      })
    }

    res.json({ 
      message: 'Push token removed successfully',
      pushToken
    })
  } catch (error) {
    console.error('Error removing push token:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.get('/chats', authenticate, async (req: AuthRequest, res) => {
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  try {
    const chatsSnapshot = await firestore
      .collection('chats')
      .where('participants', 'array-contains', currentUserId)
      .get()

    if (chatsSnapshot.empty) {
      console.log('No chats found for user:', currentUserId)
      res.json([])
      return
    }

    const chatsFirebase = chatsSnapshot.docs.map(doc => {
      const chat = doc.data() as Chat
      chat.id = doc.id
      chat.createdAt = doc.data().createdAt.toDate()
      chat.updatedAt = doc.data().updatedAt?.toDate()
      return chat
    })

    console.log('Found chats for user:', currentUserId, 'chat IDs:', chatsFirebase.map(chat => chat.id))

    const chats: ChatResponse[] = []
    for (const chat of chatsFirebase) {
      // Get chat participants info
      const participants = chat.participants
      const members: User[] = []
      for (const participant of participants) {
        const participantSnapshot = await firestore
          .collection('users')
          .doc(participant)
          .get()

        if (participantSnapshot.exists) {
          members.push(participantSnapshot.data() as User)
        } else {
          console.warn('Participant not found:', { userId: currentUserId, chatId: chat.id, participant, participants: chat.participants })
        }
      }

      // Get chat ride info
      const ride = chat.rideId != null ? await getRide({ id: chat.rideId }) : null

      // Get chat owner info
      const owner = members.find(member => member.id === chat.owner)

      // Decrypt last message content
      const lastMessage: Message | null = chat.lastMessage != null
        ? {
          ...chat.lastMessage,
          content: decryptMessage(chat.lastMessage.content)
        }
        : null

      const chatResponse: ChatResponse = {
        ...chat,
        participants: members,
        owner: owner as User,
        lastMessage,
        ride
      }
      chats.push(chatResponse)
    }

    res.json(chats)
  } catch (error) {
    console.error('Error fetching chats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.get('/chats/:id', authenticate, async (req: AuthRequest, res) => {
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const chatId = req.params.id

  try {
    const chatSnapshot = await firestore
      .collection('chats')
      .doc(chatId)
      .get()

    if (!chatSnapshot.exists) {
      res.status(404).json({ error: 'Chat not found' })
      return
    }

    const chat = chatSnapshot.data() as Chat
    chat.id = chatSnapshot.id
    chat.createdAt = chatSnapshot.data()?.createdAt?.toDate()
    chat.updatedAt = chatSnapshot.data()?.updatedAt?.toDate()

    if (chat.deletedAt != null) {
      res.status(404).json({ error: 'Chat deleted' })
      return
    }

    if (!chat.participants.includes(currentUserId)) {
      res.status(403).json({ error: 'You are not a participant of this chat' })
      return
    }

    const members: User[] = []
    for (const participant of chat.participants) {
      const participantSnapshot = await firestore
        .collection('users')
        .doc(participant)
        .get()

      if (participantSnapshot.exists) {
        members.push(participantSnapshot.data() as User)
      }
    }

    // Check if lastMessage is from past participants
    if (chat.lastMessage && chat.lastMessage.senderId && chat.pastParticipants?.includes(chat.lastMessage.senderId)) {
      chat.lastMessage = undefined
    }

    // Update chat last message seenBy
    if (chat.lastMessage && !chat.lastMessage.seenBy?.includes(currentUserId)) {
      try {
        await firestore.collection('chats').doc(chatId).update({
          lastMessage: {
            ...chat.lastMessage,
            seenBy: FieldValue.arrayUnion(currentUserId)
          }
        })
      } catch (error) {
        console.error('Error updating chat last message seenBy:', error)
        res.status(500).json({ message: 'Internal server error' })
        return
      }
    }

    // Decrypt last message content if it exists
    const lastMessage: Message | null = chat.lastMessage != null
      ? {
        ...chat.lastMessage,
        content: decryptMessage(chat.lastMessage.content)
      }
      : null

    const chatResponse: ChatResponse = {
      ...chat,
      participants: members,
      owner: members.find(member => member.id === chat.owner) as User,
      lastMessage,
      ride: chat.rideId != null ? await getRide({ id: chat.rideId }) : null
    }

    res.json(chatResponse)
  } catch (error) {
    console.error('Error fetching chat:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.post('/chats/:id/messages', authenticate, async (req: AuthRequest, res) => {
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const chatId = req.params.id

  try {
    const chatSnapshot = await firestore.collection('chats').doc(chatId).get()

    if (!chatSnapshot.exists) {
      console.error('Chat not found:', { chatId, userId: currentUserId })
      res.status(404).json({ error: 'Chat not found' })
      return
    }

    const chat = chatSnapshot.data() as Chat
    if (!chat.participants.includes(currentUserId)) {
      console.error('User is not a participant of chat:', { chatId, userId: currentUserId, participants: chat.participants })
      res.status(403).json({ error: 'You are not a participant of this chat' })
      return
    }

    const userMessagesSnapshot = await firestore
      .collection(`chats/${chatId}/messages`)
      .where('userId', '==', currentUserId)
      .get()

    const oneMinuteAgo = new Date(Date.now() - 60000)
    const recentMessages = userMessagesSnapshot.docs.filter(doc => doc.createTime.toDate() > oneMinuteAgo)
    console.debug('Recent messages:', { userId: currentUserId, chatId, recentMessages: recentMessages.map(doc => doc.id) })

    if (recentMessages.length >= 10) {
      console.error('Too many messages in a short period of time:', { userId: currentUserId, chatId })
      res.status(429).json({ message: 'Too many messages in a short period of time' })
      return
    }

    const messageRequest = validateMessage(req.body)
    if (!messageRequest.success) {
      console.error('Message schema validation failed:', { userId: currentUserId, chatId, error: messageRequest.error })
      res.status(400).json({ message: 'Invalid request' })
      return
    }

    const newMessageRef = firestore.collection(`chats/${chatId}/messages`)
    const newMessage: Message = {
      id: newMessageRef.id,
      content: encryptMessage(messageRequest.data.content),
      createdAt: new Date(),
      userId: currentUserId,
      seenBy: []
    }

    try {
      await newMessageRef.add(newMessage)
      console.debug('Message added:', { userId: currentUserId, chatId, message: newMessage.id })
    } catch (error) {
      console.error('Cannot add message:', { userId: currentUserId, chatId, error })
      res.status(500).json({ message: 'Internal server error' })
      return
    }

    try {
      await firestore.collection('chats').doc(chatId).update({ lastMessage: newMessage })
      console.debug('Chat last message updated:', { userId: currentUserId, chatId, message: newMessage.id })
    } catch (error) {
      console.error('Cannot update chat last message:', { userId: currentUserId, chatId, error })
      res.status(500).json({ message: 'Internal server error' })
      return
    }

    const otherParticipants = chat.participants.filter(p => p !== currentUserId)
    const pushMessages = []

    for (const participantId of otherParticipants) {
      try {
        const userSnapshot = await firestore.collection('users').doc(participantId).get()
        const userData = userSnapshot.data()

        const pushTokens = userData?.pushToken || []
        for (const pushToken of pushTokens) {
          if (Expo.isExpoPushToken(pushToken)) {
            pushMessages.push({
              to: pushToken,
              sound: 'default',
              title: 'Nuevo mensaje',
              body: messageRequest.data.content.slice(0, 80),
              data: {
                chatId,
                senderId: currentUserId
              }
            })
          }
        }
      } catch (error) {
        console.error('Error getting participant data for push:', { participantId, error })
      }
    }

    if (pushMessages.length > 0) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(pushMessages)
        console.debug('Push notifications sent:', receipts)
      } catch (error) {
        console.error('Failed to send push notifications:', error)
      }
    }

    console.info('Message sent:', { userId: currentUserId, chatId })
    res.json({ message: 'Message sent successfully' })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.post('/ratings', authenticate, async (req: AuthRequest, res) => {
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const ratingRequest = validateRating(req.body)
  if (!ratingRequest.success) {
    res.status(400).json({ message: ratingRequest.error.message })
    return
  }

  if (currentUserId === ratingRequest.data.targetUserId) {
    res.status(400).json({ message: 'You cannot rate yourself' })
    return
  }

  // Validate ride and compute required targets to rate
  const rideDoc = await firestore.collection('rides').doc(ratingRequest.data.rideId).get()
  if (!rideDoc.exists) {
    res.status(404).json({ message: 'Ride not found' })
    return
  }
  const rideData = rideDoc.data() as Ride
  const allParticipants = [rideData.driver?.id, ...(rideData.passengers?.map(p => p.id) ?? [])].filter(Boolean) as string[]
  const requiredTargets = new Set(allParticipants.filter(uid => uid !== currentUserId))

  // Create rating entity
  const ratingRef = firestore.collection('ratings').doc()
  const rating: Rating = {
    id: ratingRef.id,
    raterId: currentUserId,
    targetUserId: ratingRequest.data.targetUserId,
    rideId: ratingRequest.data.rideId,
    rating: ratingRequest.data.rating,
    comment: ratingRequest.data.comment,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // create rating in firestore
  try {
    await ratingRef.set(rating)
    console.debug('Rating added:', { userId: currentUserId, rideId: ratingRequest.data.rideId })
  } catch (error) {
    console.error('Cannot add rating:', { userId: currentUserId, rideId: ratingRequest.data.rideId, error })
    res.status(500).json({ message: 'Internal server error' })
    return
  }

  // update ride rating
  const rideRef = await firestore.collection('rides').doc(ratingRequest.data.rideId).get()
  const ride = rideRef.data() as Ride
  const rideRatings = Array.isArray(ride?.ratings) ? [...ride.ratings] : []
  rideRatings.push(ratingRef.id)

  try {
    await rideRef.ref.set({ ratings: rideRatings }, { merge: true })
    console.debug('Ride ratings updated:', { userId: currentUserId, rideId: ratingRequest.data.rideId })
  } catch (error) {
    console.error('Cannot update ride ratings:', { userId: currentUserId, rideId: ratingRequest.data.rideId, error })
    res.status(500).json({ message: 'Internal server error' })
    return
  }

  // update user average rating
  const userRef = await firestore.collection('users').doc(ratingRequest.data.targetUserId).get()
  if (!userRef.exists) {
    res.status(404).json({ message: 'User not found' })
    return
  }

  const user = userRef.data() as User
  user.averageRating = user.averageRating ?? 0
  user.averageRating = (user.averageRating + rating.rating) / 2
  
  try {
    await userRef.ref.set({ averageRating: user.averageRating })
    console.debug('User average rating updated:', { userId: ratingRequest.data.targetUserId })
  } catch (error) {
    console.error('Cannot update user average rating:', { userId: ratingRequest.data.targetUserId, error })
    res.status(500).json({ message: 'Internal server error' })
    return
  }

  // After creating this rating, check if current user has rated all required targets for this ride
  try {
    const myRatingsSnapshot = await firestore
      .collection('ratings')
      .where('rideId', '==', ratingRequest.data.rideId)
      .where('raterId', '==', currentUserId)
      .get()

    const ratedTargets = new Set<string>()
    myRatingsSnapshot.docs.forEach(doc => {
      const r = doc.data() as Rating
      if (r.targetUserId) ratedTargets.add(r.targetUserId)
    })

    let hasCompletedAll = true
    for (const uid of requiredTargets) {
      if (!ratedTargets.has(uid)) { hasCompletedAll = false; break }
    }

    if (hasCompletedAll) {
      try {
        const meSnap = await firestore.collection('users').doc(currentUserId).get()
        const meData = meSnap.data() as User | undefined
        const existingStartedAt = (meData as any)?.inRide?.rideStartedAt
          ? new Date((meData as any).inRide.rideStartedAt)
          : undefined

        await firestore.collection('users').doc(currentUserId).update({
          inRide: {
            active: (meData as any)?.inRide?.active ?? false,
            rideId: ratingRequest.data.rideId,
            rideStartedAt: existingStartedAt,
            pendingToReview: false
          },
          updatedAt: new Date()
        })
      } catch (error) {
        console.error('Failed to unset pendingToReview after completing ratings:', { userId: currentUserId, rideId: ratingRequest.data.rideId, error })
      }
    }
  } catch (error) {
    console.error('Error validating completed ratings:', { userId: currentUserId, rideId: ratingRequest.data.rideId, error })
  }

  res.json({ message: 'Rating added successfully' })
  
  
})

app.get('/rides/:id/ratings/pending', authenticate, async (req: AuthRequest, res) => {
  const currentUserId = req.user?.uid
  if (currentUserId == null) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const rideId = req.params.id

  try {
    const rideDoc = await firestore.collection('rides').doc(rideId).get()
    if (!rideDoc.exists) {
      res.status(404).json({ message: 'Ride not found' })
      return
    }

    const rideData = rideDoc.data() as Ride
    const allParticipants = [rideData.driver?.id, ...(rideData.passengers?.map(p => p.id) ?? [])].filter(Boolean) as string[]

    // Remove self from required targets
    const requiredTargets = new Set(allParticipants.filter(uid => uid !== currentUserId))

    // Fetch my ratings for this ride
    const myRatingsSnapshot = await firestore
      .collection('ratings')
      .where('rideId', '==', rideId)
      .where('raterId', '==', currentUserId)
      .get()

    const ratedTargets = new Set<string>()
    myRatingsSnapshot.docs.forEach(doc => {
      const r = doc.data() as Rating
      if (r.targetUserId) ratedTargets.add(r.targetUserId)
    })

    const pending = Array.from(requiredTargets).filter(uid => !ratedTargets.has(uid))

    // Include user details and whether they are the driver
    const pendingUsers = [] as Array<{ user: User, isDriver: boolean }>
    for (const uid of pending) {
      const userSnap = await firestore.collection('users').doc(uid).get()
      if (userSnap.exists) {
        pendingUsers.push({
          user: userSnap.data() as User,
          isDriver: rideData.driver?.id === uid
        })
      }
    }

    res.json({ rideId, pendingUserIds: pending, pendingUsers })
  } catch (error) {
    console.error('Error fetching pending ratings:', { rideId, userId: currentUserId, error })
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
