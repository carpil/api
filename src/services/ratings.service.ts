import { RatingsRepository } from '../repositories/firebase/ratings.repository'
import { RidesRepository } from '../repositories/firebase/rides.repository'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { CreateRatingInput } from '../models/rating.model'
import { HttpError } from '../utils/http'
import { RideStatus } from '../models/ride.model'

export class RatingsService {
  constructor(
    private readonly ratingsRepo: RatingsRepository,
    private readonly ridesRepo: RidesRepository,
    private readonly usersRepo: UsersRepository
  ) {}

  async create(currentUserId: string, input: CreateRatingInput) {
    if (!currentUserId) throw new HttpError(401, 'Unauthorized')
    if (currentUserId === input.targetUserId) throw new HttpError(400, 'You cannot rate yourself')

    const ride = await this.ridesRepo.getById(input.rideId)
    if (!ride) throw new HttpError(404, 'Ride not found')
    if (![RideStatus.Completed].includes(ride.status)) {
      // Optionally enforce completion before rating
    }

    const participants = [ride.driver?.id, ...(ride.passengers?.map(p => p.id) ?? [])].filter(Boolean) as string[]
    if (!participants.includes(currentUserId) || !participants.includes(input.targetUserId)) {
      throw new HttpError(400, 'Invalid participants for rating')
    }

    const rating = await this.ratingsRepo.create({
      ...input,
      raterId: currentUserId,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Link rating to ride
    const rideRef = await this.ridesRepo.getById(input.rideId)
    const rideRatings = Array.isArray(rideRef?.ratings) ? [...rideRef!.ratings] : []
    rideRatings.push(rating.id)
    await this.ridesRepo.update(input.rideId, { ratings: rideRatings })

    // Update user average rating (simple running avg placeholder matching current code)
    const target = await this.usersRepo.getById(input.targetUserId)
    if (!target) throw new HttpError(404, 'User not found')
    const currentAvg = target.averageRating ?? 0
    const newAvg = (currentAvg + input.rating) / 2
    await this.usersRepo.update(input.targetUserId, { averageRating: newAvg })

    // Validate completion of required ratings for rater
    const myRatings = await this.ratingsRepo.listMyRatingsForRide(input.rideId, currentUserId)
    const ratedTargets = new Set<string>(myRatings.map(r => r.targetUserId))
    const requiredTargets = new Set<string>(participants.filter(uid => uid !== currentUserId))
    const hasCompletedAll = Array.from(requiredTargets).every(uid => ratedTargets.has(uid))
    if (hasCompletedAll) {
      await this.ridesRepo.setParticipant(input.rideId, currentUserId, { active: false, pendingToReview: false })
      await this.removePendingReviewRide(currentUserId, input.rideId)
    }

    return rating
  }

  async listPending(rideId: string, currentUserId: string) {
    const ride = await this.ridesRepo.getById(rideId)
    if (!ride) throw new HttpError(404, 'Ride not found')
    const all = [ride.driver?.id, ...(ride.passengers?.map(p => p.id) ?? [])].filter(Boolean) as string[]
    const required = new Set(all.filter(uid => uid !== currentUserId))

    const mine = await this.ratingsRepo.listMyRatingsForRide(rideId, currentUserId)
    const rated = new Set(mine.map(r => r.targetUserId))
    const pendingIds = Array.from(required).filter(uid => !rated.has(uid))

    const users = [] as Array<{ user: any, isDriver: boolean }>
    for (const uid of pendingIds) {
      const u = await this.usersRepo.getById(uid)
      if (u) users.push({ user: u, isDriver: ride.driver?.id === uid })
    }
    return { rideId, pendingUserIds: pendingIds, pendingUsers: users }
  }

  async listAllPendingForUser(currentUserId: string) {
    if (!currentUserId) throw new HttpError(401, 'Unauthorized')

    const rideIds = await this.ridesRepo.listPendingToReviewRidesForUser(currentUserId)
    if (rideIds.length === 0) return { pending: [] }

    const mostRecentRideId = rideIds[0]
    const pendingRide = await this.listPending(mostRecentRideId, currentUserId)
    
    if (pendingRide.pendingUserIds.length === 0) return { pending: [] }

    const ride = await this.ridesRepo.getById(mostRecentRideId)
    return { 
      pending: [{ 
        rideId: mostRecentRideId, 
        pendingUserIds: pendingRide.pendingUserIds, 
        pendingUsers: pendingRide.pendingUsers, 
        ride 
      }] 
    }
  }

  private async removePendingReviewRide(userId: string, rideId: string) {
    const user = await this.usersRepo.getById(userId)
    if (!user) return

    const currentPending = user.pendingReviewRideIds || []
    const updatedPending = currentPending.filter(id => id !== rideId)
    
    await this.usersRepo.update(userId, { pendingReviewRideIds: updatedPending })
  }
}


