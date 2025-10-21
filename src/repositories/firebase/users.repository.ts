import { firestore } from 'config/firebase'
import { User } from '@models/user'
import { IUsersRepository } from '@interfaces/repositories.interface'

export class UsersRepository implements IUsersRepository {
  async getById(userId: string): Promise<User | null> {
    const userDocument = await firestore.collection('users').doc(userId).get()
    if (!userDocument.exists) return null
    
    const userData = userDocument.data() as any
    return {
      ...userData,
      createdAt: userData?.createdAt?.toDate() ?? null,
      updatedAt: userData?.updatedAt?.toDate() ?? null
    } as User
  }

  async update(userId: string, userUpdates: Partial<User>): Promise<void> {
    await firestore.collection('users').doc(userId).update(userUpdates)
  }

  async create(userId: string, newUser: User): Promise<void> {
    await firestore.collection('users').doc(userId).set(newUser)
  }

  async exists(userId: string): Promise<boolean> {
    const userDocument = await firestore.collection('users').doc(userId).get()
    return userDocument.exists
  }
}


