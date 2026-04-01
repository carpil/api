import { User } from '@models/user'
import { Ride } from '../models/ride.model'
import { Chat, Message } from '../models/chat.model'
import { Rating } from '../models/rating.model'
import { RideRequest } from '../models/ride-request'

// Base repository interface
export interface IBaseRepository<T> {
  getById(id: string): Promise<T | null>
  create(entity: Omit<T, 'id'>): Promise<T>
  update(id: string, partial: Partial<T>): Promise<void>
  delete(id: string): Promise<void>
}

// User repository interface
export interface IUsersRepository {
  getById(id: string): Promise<User | null>
  create(id: string, user: User): Promise<void>
  update(id: string, partial: Partial<User>): Promise<void>
  exists(id: string): Promise<boolean>
  setDriverApproved(userId: string, vehicleId: string, applicationId: string): Promise<void>
  updateDriverStatus(userId: string, status: 'active' | 'suspended' | 'blocked'): Promise<void>
  setDriverApplicationId(userId: string, applicationId: string): Promise<void>
}

// Ride repository interface
export interface IRidesRepository {
  getById(id: string): Promise<Ride | null>
  listAllDrivers(): Promise<Ride[]>
  countActiveByDriver(driverId: string): Promise<number>
  create(ride: Omit<Ride, 'id'>): Promise<Ride>
  update(id: string, partial: Partial<Ride>): Promise<void>
  addPassenger(rideId: string, passenger: any): Promise<void>
  setParticipant(rideId: string, userId: string, payload: { active: boolean, pendingToReview: boolean }): Promise<void>
  listPendingToReviewRidesForUser(userId: string): Promise<string[]>
}

// Chat repository interface
export interface IChatsRepository {
  getById(chatId: string): Promise<Chat | null>
  listByParticipant(userId: string): Promise<Chat[]>
  createForRide(rideId: string, ownerId: string): Promise<{ id: string }>
  addParticipant(chatId: string, userId: string): Promise<void>
  addMessage(chatId: string, message: Message): Promise<void>
  updateLastMessage(chatId: string, message: Message): Promise<void>
  softDelete(chatId: string): Promise<void>
}

// Rating repository interface
export interface IRatingsRepository {
  create(rating: Omit<Rating, 'id'>): Promise<Rating>
  listMyRatingsForRide(rideId: string, raterId: string): Promise<Rating[]>
  getById(id: string): Promise<Rating | null>
  update(id: string, partial: Partial<Rating>): Promise<void>
}

// Notification repository interface (for push tokens)
export interface INotificationsRepository {
  addToken(userId: string, token: string): Promise<void>
  removeToken(userId: string, token: string): Promise<void>
  getTokens(userId: string): Promise<string[]>
}

// Ride Request repository interface
export interface IRideRequestsRepository {
  getById(id: string): Promise<RideRequest | null>
  listAll(): Promise<RideRequest[]>
  create(rideRequest: Omit<RideRequest, 'id'>): Promise<RideRequest>
  update(id: string, partial: Partial<RideRequest>): Promise<void>
  delete(id: string): Promise<void>
}
