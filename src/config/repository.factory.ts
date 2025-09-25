// Repository Factory - Easy way to switch between different database implementations
import { IUsersRepository } from '@interfaces/repositories.interface'
import { UsersRepository } from '../repositories/firebase/users.repository'
// Future database implementations can be added here

export type DatabaseType = 'firebase' | 'postgresql' | 'mongodb'

export class RepositoryFactory {
  static createUsersRepository(dbType: DatabaseType = 'firebase'): IUsersRepository {
    switch (dbType) {
      case 'firebase':
        return new UsersRepository()
      // case 'postgresql':
      //   return new PostgreSQLUsersRepository()
      // case 'mongodb':
      //   return new MongoDBUsersRepository()
      default:
        throw new Error(`Unsupported database type: ${dbType}`)
    }
  }

  // You can add more factory methods for other repositories
  // static createRidesRepository(dbType: DatabaseType): IRidesRepository { ... }
  // static createChatsRepository(dbType: DatabaseType): IChatsRepository { ... }
}
