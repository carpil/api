// Repository Factory - Easy way to switch between different database implementations
import { IUsersRepository } from '@interfaces/repositories.interface'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { RidesRepository } from '../repositories/firebase/rides.repository'
import { ChatsRepository } from '../repositories/firebase/chats.repository'
import { PaymentsRepository } from '../repositories/firebase/payments.repository'
import { RatingsRepository } from '../repositories/firebase/ratings.repository'
import { NotificationsRepository } from '../repositories/firebase/notifications.repository'
import { RideRequestsRepository } from '../repositories/firebase/ride-requests.repository'
// Future database implementations can be added here

export type DatabaseType = 'firebase' | 'postgresql' | 'mongodb'

export class RepositoryFactory {
  static createUsersRepository(dbType: DatabaseType = 'firebase'): IUsersRepository {
    switch (dbType) {
      case 'firebase':
        return new UsersRepository()
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }

  static createRidesRepository(dbType: DatabaseType = 'firebase'): RidesRepository {
    switch (dbType) {
      case 'firebase':
        return new RidesRepository(new UsersRepository())
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }

  static createChatsRepository(dbType: DatabaseType = 'firebase'): ChatsRepository {
    switch (dbType) {
      case 'firebase':
        return new ChatsRepository()
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }

  static createPaymentsRepository(dbType: DatabaseType = 'firebase'): PaymentsRepository {
    switch (dbType) {
      case 'firebase':
        return new PaymentsRepository()
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }

  static createRatingsRepository(dbType: DatabaseType = 'firebase'): RatingsRepository {
    switch (dbType) {
      case 'firebase':
        return new RatingsRepository()
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }

  static createNotificationsRepository(dbType: DatabaseType = 'firebase'): NotificationsRepository {
    switch (dbType) {
      case 'firebase':
        return new NotificationsRepository()
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }

  static createRideRequestsRepository(dbType: DatabaseType = 'firebase'): RideRequestsRepository {
    switch (dbType) {
      case 'firebase':
        return new RideRequestsRepository()
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }
}
