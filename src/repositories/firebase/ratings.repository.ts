import { firestore } from 'config/firebase'
import { Rating } from '@models/rating.model'
import { IRatingsRepository } from '@interfaces/repositories.interface'

export class RatingsRepository implements IRatingsRepository {
  async create(newRating: Omit<Rating, 'id'>): Promise<Rating> {
    const ratingDocumentRef = firestore.collection('ratings').doc()
    const ratingWithId = { ...newRating, id: ratingDocumentRef.id }
    await ratingDocumentRef.set(ratingWithId)
    return ratingWithId as Rating
  }

  async listMyRatingsForRide(rideId: string, raterId: string): Promise<Rating[]> {
    const ratingsQuery = await firestore
      .collection('ratings')
      .where('rideId', '==', rideId)
      .where('raterId', '==', raterId)
      .get()
    return ratingsQuery.docs.map(ratingDocument => ratingDocument.data() as Rating)
  }

  async getById(ratingId: string): Promise<Rating | null> {
    const ratingDocument = await firestore.collection('ratings').doc(ratingId).get()
    if (!ratingDocument.exists) return null
    return ratingDocument.data() as Rating
  }

  async update(ratingId: string, ratingUpdates: Partial<Rating>): Promise<void> {
    await firestore.collection('ratings').doc(ratingId).update(ratingUpdates)
  }
}


