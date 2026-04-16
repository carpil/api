import { UsersRepository } from '../repositories/firebase/users.repository'
import { RidesRepository } from '../repositories/firebase/rides.repository'
import { HttpError } from '../utils/http'
import { User } from '@models/user'
import { RatingsService } from './ratings.service'
import { RidesService } from './rides.service'
import { UserInfo } from '@models/user-info'
import { RideInfo } from '@models/ride-info'
import { auth } from '../config/firebase'

export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly ratingsService: RatingsService,
    private readonly ridesService: RidesService,
    private readonly ridesRepo: RidesRepository
  ) { }

  async signup(currentUser: { uid: string, email?: string }, input: User) {
    if (!currentUser?.uid || input.id !== currentUser.uid) throw new HttpError(401, 'Unauthorized')
    if (currentUser.email && input.email && input.email !== currentUser.email) throw new HttpError(401, 'Unauthorized')

    const exists = await this.usersRepo.exists(input.id)
    if (exists) throw new HttpError(400, 'User already exists')

    const toSave: User = {
      ...input,
      id: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    await this.usersRepo.create(currentUser.uid, toSave)
    return toSave
  }

  async signupEmail(currentUser: { uid: string, email?: string }, input: { firstName: string, lastName: string, phoneNumber: string, email: string }) {
    if (!currentUser?.uid) throw new HttpError(401, 'Unauthorized')
    if (currentUser.email && input.email !== currentUser.email) throw new HttpError(401, 'Unauthorized')

    const exists = await this.usersRepo.exists(currentUser.uid)
    if (exists) throw new HttpError(400, 'User already exists')

    const formattedPhoneNumber = `+506${input.phoneNumber}`

    const toSave: User = {
      id: currentUser.uid,
      name: `${input.firstName} ${input.lastName}`,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: formattedPhoneNumber,
      email: input.email,
      profilePicture: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    await this.usersRepo.create(currentUser.uid, toSave)
    return toSave
  }

  async login(currentUser: { uid: string, email?: string }, input: User) {
    if (!currentUser?.uid || input.id !== currentUser.uid) throw new HttpError(401, 'Unauthorized')
    if (currentUser.email && input.email && input.email !== currentUser.email) throw new HttpError(401, 'Unauthorized')

    const user = await this.usersRepo.getById(currentUser.uid)
    if (!user) throw new HttpError(404, 'User not found')
    return {
      ...user,
      id: currentUser.uid,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt ?? new Date()
    }
  }

  async loginSocial(currentUser: { uid: string, email?: string }, input: User) {
    if (!currentUser?.uid || input.id !== currentUser.uid) throw new HttpError(401, 'Unauthorized')
    if (currentUser.email && input.email && input.email !== currentUser.email) throw new HttpError(401, 'Unauthorized')

    const existing = await this.usersRepo.getById(currentUser.uid)
    if (!existing) {
      const toSave: User = {
        ...input,
        id: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await this.usersRepo.create(currentUser.uid, toSave)
      return toSave
    }

    return {
      ...existing,
      id: currentUser.uid,
      createdAt: existing.createdAt ?? new Date(),
      updatedAt: existing.updatedAt ?? new Date()
    }
  }

  async getById(id: string) {
    const u = await this.usersRepo.getById(id)
    if (!u) throw new HttpError(404, 'User not found')
    return u
  }

  async bootstrap(userId: string) {
    if (!userId) throw new HttpError(401, 'Unauthorized')

    const user = await this.usersRepo.getById(userId)
    if (!user) throw new HttpError(404, 'User not found')

    const inRide = !!user.currentRideId
    let isDriver = false

    if (user.currentRideId) {
      try {
        const ride = await this.ridesService.getRideById(user.currentRideId)
        isDriver = ride.driver.id === userId
      } catch (error) {
      }
    }

    const pendingReviewRideIds = user.pendingReviewRideIds || []
    const pendingPaymentRideIds = user.pendingPaymentRideIds || []

    // Step 1: If in progress, rideId is currentRideId
    if (inRide) return { rideId: user.currentRideId, inRide, pendingReviews: null, pendingPayment: null, isDriver }

    // Step 2: Check for pending payments (non-drivers only)
    let pendingPayment: RideInfo | null = null
    if (pendingPaymentRideIds.length > 0) {
      const mostRecentPaymentRideId = pendingPaymentRideIds[0]

      try {
        const ride = await this.ridesService.getRideById(mostRecentPaymentRideId)
        // Only create pendingPayment info if user is not the driver
        if (ride.driver.id !== userId) {
          pendingPayment = {
            rideId: ride.id,
            origin: ride.origin,
            destination: ride.destination,
            price: ride.price,
            completedAt: ride.completedAt || new Date()
          }
        }
      } catch (error) {
        // Non-critical error
      }
    }

    // Step 3: Check for pending reviews
    let pendingReviews: Array<UserInfo & { rideId: string }> | null = null
    let rideId: string | null = null

    if (pendingReviewRideIds.length > 0) {
      const mostRecentRideId = pendingReviewRideIds[0]
      rideId = mostRecentRideId

      try {
        const pendingRide = await this.ratingsService.listPending(mostRecentRideId, userId)

        if (pendingRide.pendingUserIds.length > 0) {
          pendingReviews = pendingRide.pendingUsers.map((item: any) => ({
            id: item.user.id,
            name: item.user.name,
            profilePicture: item.user.profilePicture,
            role: item.isDriver ? 'driver' : 'passenger',
            rideId: mostRecentRideId
          }))
        }
      } catch (error) {
        // Non-critical error
      }
    }

    // If there's a pending payment, use that rideId
    if (pendingPayment) {
      rideId = pendingPayment.rideId
    }

    return {
      rideId,
      inRide,
      pendingReviews,
      pendingPayment,
      isDriver
    }
  }

  async getUserInfo(userId: string) {
    const user = await this.usersRepo.getById(userId)
    if (!user) throw new HttpError(404, 'User not found')

    const rideCounts = await this.ridesRepo.countCompletedRidesByUser(userId)

    return {
      userId: user.id,
      name: user.name,
      profilePicture: user.profilePicture,
      averageRating: user.averageRating ?? 0,
      ridesCompletedAsDriver: rideCounts.asDriver,
      ridesCompletedAsPassenger: rideCounts.asPassenger,
      joinedAt: user.createdAt
    }
  }

  async deleteAccount(userId: string) {
    if (!userId) throw new HttpError(401, 'Unauthorized')

    const user = await this.usersRepo.getById(userId)
    if (!user) throw new HttpError(404, 'User not found')

    if (user.currentRideId || user.inRide) {
      throw new HttpError(400, 'Cannot delete account while in an active ride')
    }

    await this.usersRepo.delete(userId)
    await auth.deleteUser(userId)
  }
}



