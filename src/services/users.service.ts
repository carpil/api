import { UsersRepository } from '../repositories/firebase/users.repository'
import { HttpError } from '../utils/http'
import { User } from '@models/user'
import { RatingsService } from './ratings.service'
import { RidesService } from './rides.service'
import { UserInfo } from '@models/user-info'

export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly ratingsService: RatingsService,
    private readonly ridesService: RidesService
  ) {}

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
        console.error('Error getting ride:', error)
      }
    }

    const pendingReviewRideIds = user.pendingReviewRideIds || []
    
    // Step 1: If in progress, rideId is currentRideId
    if (inRide) return { rideId: user.currentRideId, inRide, pendingReviews: null, isDriver }

    // Step 2: If completed but has pending reviews, rideId is the pending ride
    if (pendingReviewRideIds.length > 0) {
      const mostRecentRideId = pendingReviewRideIds[0]
      
      try {
        const pendingRide = await this.ratingsService.listPending(mostRecentRideId, userId)
        
        if (pendingRide.pendingUserIds.length === 0) {
          // Step 3: No pending reviews, set rideId to null
          return { rideId: null, inRide, pendingReviews: null, isDriver }
        }

        const pendingReviews: UserInfo[] = pendingRide.pendingUsers.map((item: any) => ({
          id: item.user.id,
          name: item.user.name,
          profilePicture: item.user.profilePicture,
          role: item.isDriver ? 'driver' : 'passenger'
        }))

        return { 
          rideId: mostRecentRideId, 
          inRide, 
          pendingReviews: pendingReviews.length > 0 ? pendingReviews : null,
          isDriver
        }
      } catch (error) {
        console.error('Error getting pending reviews:', error)
        return { rideId: null, inRide, pendingReviews: null, isDriver }
      }
    }
    
    // Step 3: Completed with no pending reviews, rideId is null
    return { rideId: null, inRide, pendingReviews: null, isDriver }
  }
}


