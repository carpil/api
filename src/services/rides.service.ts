import { RidesRepository } from '../repositories/firebase/rides.repository'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { ChatsRepository } from '../repositories/firebase/chats.repository'
import { PaymentsRepository } from '../repositories/firebase/payments.repository'
import { CreateRideInput, Ride, RideStatus } from '../models/ride.model'
import { HttpError } from '../utils/http'
import { sendPushNotifications } from 'config/push-notifications'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const MAX_RIDES_PER_HOUR = 5
const MAX_ACTIVE_RIDES = 2

const userRateLimitStore = new Map<string, { count: number, timestamp: number }>()

export class RidesService {
  constructor(
    private readonly ridesRepo: RidesRepository,
    private readonly usersRepo: UsersRepository,
    private readonly chatsRepo: ChatsRepository,
    private readonly paymentsRepo: PaymentsRepository
  ) {}

  async createRide(driverId: string, rideData: CreateRideInput): Promise<Ride> {
    if (!driverId) throw new HttpError(401, 'Unauthorized')

    const currentTime = Date.now()
    const userRateLimit = userRateLimitStore.get(driverId)
    if (userRateLimit != null) {
      if (currentTime - userRateLimit.timestamp > RATE_LIMIT_WINDOW_MS) {
        userRateLimitStore.set(driverId, { count: 1, timestamp: currentTime })
      } else if (userRateLimit.count >= MAX_RIDES_PER_HOUR) {
        throw new HttpError(429, 'Rate limit exceeded. Please wait before creating more rides.')
      } else {
        userRateLimit.count++
      }
    } else {
      userRateLimitStore.set(driverId, { count: 1, timestamp: currentTime })
    }

    const activeRidesCount = await this.ridesRepo.countActiveByDriver(driverId)
    if (activeRidesCount >= MAX_ACTIVE_RIDES) {
      throw new HttpError(400, `You cannot have more than ${MAX_ACTIVE_RIDES} active rides at the same time.`)
    }

    const driver = await this.usersRepo.getById(driverId)
    if (!driver) throw new HttpError(404, 'Driver not found')
    const driverInfo = { id: driver.id, name: driver.name, profilePicture: driver.profilePicture }

    const newRide: Omit<Ride, 'id'> = {
      ...rideData,
      driver: driverInfo,
      deletedAt: null,
      status: RideStatus.Active,
      chatId: '',
      passengers: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createdRide = await this.ridesRepo.create(newRide)

    const rideChat = await this.chatsRepo.createForRide(createdRide.id, driverId)
    await this.ridesRepo.update(createdRide.id, { chatId: rideChat.id })

    return { ...createdRide, chatId: rideChat.id }
  }

  async listDriverRides() {
    return this.ridesRepo.listAllDrivers()
  }

  async getRideById(id: string) {
    const ride = await this.ridesRepo.getById(id)
    if (!ride) throw new HttpError(404, 'Ride not found')
    return ride
  }

  async joinRide(rideId: string, passengerId: string) {
    const ride = await this.getRideById(rideId)
    if (ride.driver.id === passengerId) throw new HttpError(400, 'You cannot join your own ride')
    if (ride.status !== RideStatus.Active) throw new HttpError(400, 'Ride is not active')
    if (ride.availableSeats <= 0) throw new HttpError(400, 'No available seats')
    if (ride.passengers.some((passenger: any) => passenger.id === passengerId)) throw new HttpError(400, 'You are already a passenger on this ride')

    const passenger = await this.usersRepo.getById(passengerId)
    if (!passenger) throw new HttpError(404, 'Passenger not found')
    const passengerInfo = { id: passenger.id, name: passenger.name, profilePicture: passenger.profilePicture }

    await this.ridesRepo.addPassenger(rideId, passengerInfo)
    if (ride.chatId) await this.chatsRepo.addParticipant(ride.chatId, passengerId)

    // Send push notification to driver
    const driver = await this.usersRepo.getById(ride.driver.id)
    if (driver) {
      await sendPushNotifications({
        pushTokens: driver?.pushToken || [],
        title: 'Nuevo pasajero se ha unido al viaje',
        body: `${passenger.name} se ha unido al viaje.`,
        data: { rideId, passengerId, url: `carpil://ride/${rideId}?source=push` }
      })
    }
    // Send push notification to rest passengers (excluding driver)
    const passengers = Array.isArray(ride.passengers) ? ride.passengers : []
    const deviceTokens: string[] = []
    for (const passenger of passengers) {
      if (passenger.id !== passengerId) {
        const passengerUser = await this.usersRepo.getById(passenger.id)
        deviceTokens.push(...passengerUser?.pushToken || [])
      }
    }
    if (deviceTokens.length > 0) {
      await sendPushNotifications({
        pushTokens: deviceTokens,
        title: 'Nuevo pasajero se ha unido al viaje',
        body: `${passenger.name} se ha unido al viaje.`,
        data: { rideId, passengerId, url: `carpil://ride/${rideId}?source=push` }
      })
    }
  }

  async startRide(rideId: string, driverId: string) {
    const ride = await this.getRideById(rideId)
    if (ride.driver.id !== driverId) throw new HttpError(403, 'Only the driver can start this ride')
    if (ride.status !== RideStatus.Active) throw new HttpError(400, 'Ride cannot be started in its current status')

    await this.ridesRepo.update(rideId, { status: RideStatus.InProgress, startedAt: new Date(), updatedAt: new Date() })
    await this.usersRepo.update(driverId, { currentRideId: rideId })
    await this.ridesRepo.setParticipant(rideId, driverId, { active: true, pendingToReview: false })

    const passengers = Array.isArray(ride.passengers) ? ride.passengers : []
    const deviceTokens: string[] = []

    for (const passenger of passengers) {
      await this.usersRepo.update(passenger.id, { currentRideId: rideId })
      await this.ridesRepo.setParticipant(rideId, passenger.id, { active: true, pendingToReview: false })

      const passengerUser = await this.usersRepo.getById(passenger.id)
      const pushTokens = passengerUser?.pushToken || []
      deviceTokens.push(...pushTokens)
    }

    if (deviceTokens.length > 0) {
      await sendPushNotifications({
        pushTokens: deviceTokens,
        title: 'Tu viaje ha iniciado',
        body: 'El conductor ha iniciado el viaje.',
        data: { rideId, driverId, url: `carpil://ride-navigation/${rideId}?source=push` }
      })
    }

    return { message: 'Ride started successfully' }
  }

  async completeRide(rideId: string, driverId: string) {
    const ride = await this.getRideById(rideId)
    if (ride.driver.id !== driverId) throw new HttpError(403, 'Only the driver can complete this ride')
    if (ride.status !== RideStatus.InProgress && ride.status !== RideStatus.InRoute) {
      throw new HttpError(400, 'Ride cannot be completed in its current status')
    }

    const participantsIds = [ride.driver?.id, ...(Array.isArray(ride.passengers) ? ride.passengers.map(p => p.id) : [])].filter(Boolean) as string[]
    const driverPendingTargets = participantsIds.filter(id => id !== driverId).length > 0

    // Set ride status to on-checkout instead of completed
    await this.ridesRepo.update(rideId, { status: RideStatus.OnCheckout, completedAt: new Date(), updatedAt: new Date() })
    await this.usersRepo.update(driverId, { currentRideId: null })
    await this.ridesRepo.setParticipant(rideId, driverId, { active: false, pendingToReview: driverPendingTargets })

    // Driver can review immediately (doesn't need to pay)
    if (driverPendingTargets) {
      await this.addPendingReviewRide(driverId, rideId)
    }

    const passengers = Array.isArray(ride.passengers) ? ride.passengers : []
    const deviceTokens: string[] = []

    // Create payment records for each passenger
    for (const passenger of passengers) {
      const passengerUser = await this.usersRepo.getById(passenger.id)
      await this.usersRepo.update(passenger.id, { currentRideId: null })
      
      // Create payment record for passenger
      await this.paymentsRepo.createPayment(rideId, {
        userId: passenger.id,
        amount: ride.price,
        rideId,
        description: `Pago del viaje ${rideId}`
      })

      // Add to pendingPaymentRideIds (not pendingReviewRideIds yet)
      const currentPendingPayment = passengerUser?.pendingPaymentRideIds || []
      const updatedPendingPayment = [rideId, ...currentPendingPayment.filter(id => id !== rideId)]
      await this.usersRepo.update(passenger.id, { pendingPaymentRideIds: updatedPendingPayment })

      // DO NOT add to pendingReviewRideIds until payment is confirmed
      await this.ridesRepo.setParticipant(rideId, passenger.id, { active: false, pendingToReview: false })

      const pushTokens = passengerUser?.pushToken || []
      deviceTokens.push(...pushTokens)
    }

    if (deviceTokens.length > 0) {
      await sendPushNotifications({
        pushTokens: deviceTokens,
        title: 'Tu viaje ha completado',
        body: 'El conductor ha completado el viaje.',
        data: { rideId, driverId, url: `carpil://checkout/${rideId}?source=push` }
      })
    }

    return { message: 'Ride completed successfully' }
  }

  private async addPendingReviewRide(userId: string, rideId: string) {
    const user = await this.usersRepo.getById(userId)
    if (!user) return

    const currentPending = user.pendingReviewRideIds || []
    const updatedPending = [rideId, ...currentPending.filter(id => id !== rideId)]
    
    await this.usersRepo.update(userId, { pendingReviewRideIds: updatedPending })
  }
}


