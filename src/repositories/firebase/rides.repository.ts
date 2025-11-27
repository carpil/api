import { firestore } from 'config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { Ride, RideStatus, UserInfo } from '@models/ride.model'
import { IRidesRepository } from '@interfaces/repositories.interface'
import { UsersRepository } from './users.repository'

export class RidesRepository implements IRidesRepository {
  constructor(private readonly usersRepo: UsersRepository) {}
  async getById(rideId: string): Promise<Ride | null> {
    const rideDocument = await firestore.collection('rides').doc(rideId).get()
    if (!rideDocument.exists) return null
    
    const rideData = rideDocument.data() as any
    return {
      ...rideData,
      id: rideDocument.id,
      departureDate: rideData?.departureDate?.toDate() ?? null,
      deletedAt: rideData?.deletedAt?.toDate() ?? null,
      createdAt: rideData?.createdAt?.toDate() ?? null,
      updatedAt: rideData?.updatedAt?.toDate() ?? null,
      startedAt: rideData?.startedAt?.toDate()
    } as Ride
  }

  async listAllDrivers(): Promise<Ride[]> {
    const ridesSnapshot = await firestore.collection('rides').get()
    const now = new Date()
    return ridesSnapshot.docs
      .map(rideDocument => {
        const rideData = rideDocument.data() as any
        return {
          ...(rideData as Ride),
          id: rideDocument.id,
          departureDate: rideData?.departureDate?.toDate() ?? null,
          deletedAt: rideData?.deletedAt?.toDate() ?? null,
          createdAt: rideData?.createdAt?.toDate() ?? null,
          updatedAt: rideData?.updatedAt?.toDate() ?? null
        }
      })
      .filter(ride => {
        if (ride.deletedAt !== null) return false
        if (ride.status === RideStatus.Completed) return false
        if (ride.departureDate && ride.departureDate < now) return false
        return true
      })
  }

  async countActiveByDriver(driverId: string): Promise<number> {
    const activeRidesQuery = await firestore
      .collection('rides')
      .where('driver.id', '==', driverId)
      .where('status', '==', RideStatus.Active)
      .where('deletedAt', '==', null)
      .get()
    return activeRidesQuery.size
  }

  async create(newRide: Omit<Ride, 'id'>): Promise<Ride> {
    const rideDocumentRef = firestore.collection('rides').doc()
    const rideWithId = { ...newRide, id: rideDocumentRef.id }
    await rideDocumentRef.set(rideWithId)
    return rideWithId as Ride
  }

  async update(rideId: string, rideUpdates: Partial<Ride>): Promise<void> {
    await firestore.collection('rides').doc(rideId).update(rideUpdates)
  }

  async addPassenger(rideId: string, passengerInfo: UserInfo): Promise<void> {
    await firestore.collection('rides').doc(rideId).update({
      passengers: FieldValue.arrayUnion(passengerInfo),
      updatedAt: new Date()
    })
  }

  async setParticipant(rideId: string, userId: string, participantStatus: { active: boolean, pendingToReview: boolean }): Promise<void> {
    await firestore.collection('rides').doc(rideId)
      .collection('participants').doc(userId)
      .set(participantStatus, { merge: true })
  }

  async listPendingToReviewRidesForUser(userId: string): Promise<string[]> {
    const user = await this.usersRepo.getById(userId)
    return user?.pendingReviewRideIds || []
  }

  async getRatingsForRide(rideId: string, raterId: string): Promise<any[]> {
    const ratingsSnapshot = await firestore
      .collection('rides')
      .doc(rideId)
      .collection('ratings')
      .where('raterId', '==', raterId)
      .get()

    return ratingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  async countCompletedRidesByUser(userId: string): Promise<{ asDriver: number, asPassenger: number }> {
    // Count rides completed as driver
    const driverRidesSnapshot = await firestore
      .collection('rides')
      .where('driver.id', '==', userId)
      .where('status', '==', RideStatus.Completed)
      .get()
    
    const asDriver = driverRidesSnapshot.size

    // Count rides completed as passenger
    const allCompletedRidesSnapshot = await firestore
      .collection('rides')
      .where('status', '==', RideStatus.Completed)
      .get()
    
    let asPassenger = 0
    allCompletedRidesSnapshot.docs.forEach(doc => {
      const ride = doc.data() as Ride
      const passengers = ride.passengers || []
      if (passengers.some(p => p.id === userId)) {
        asPassenger++
      }
    })

    return { asDriver, asPassenger }
  }
}


