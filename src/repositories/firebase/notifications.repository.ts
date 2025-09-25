import { firestore } from 'config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { INotificationsRepository } from '@interfaces/repositories.interface'

export class NotificationsRepository implements INotificationsRepository {
  async addToken(userId: string, pushToken: string): Promise<void> {
    await firestore.collection('users').doc(userId).update({
      pushToken: FieldValue.arrayUnion(pushToken),
      updatedAt: new Date()
    })
  }

  async removeToken(userId: string, pushToken: string): Promise<void> {
    await firestore.collection('users').doc(userId).update({
      pushToken: FieldValue.arrayRemove(pushToken),
      updatedAt: new Date()
    })
  }

  async getTokens(userId: string): Promise<string[]> {
    const userDocument = await firestore.collection('users').doc(userId).get()
    if (!userDocument.exists) return []
    const userData = userDocument.data()
    return userData?.pushToken || []
  }
}
