import { firestore } from 'config/firebase'
import { RideRequest, RideRequestStatus } from '@models/ride-request'
import { IRideRequestsRepository } from '@interfaces/repositories.interface'

export class RideRequestsRepository implements IRideRequestsRepository {
  async getById(rideRequestId: string): Promise<RideRequest | null> {
    const rideRequestDocument = await firestore.collection('ride-requests').doc(rideRequestId).get()
    if (!rideRequestDocument.exists) return null
    
    const rideRequestData = rideRequestDocument.data() as any
    return {
      ...rideRequestData,
      id: rideRequestDocument.id,
      departureDate: rideRequestData?.departureDate?.toDate() ?? null,
      deletedAt: rideRequestData?.deletedAt?.toDate() ?? null,
      createdAt: rideRequestData?.createdAt?.toDate() ?? null,
      updatedAt: rideRequestData?.updatedAt?.toDate() ?? null
    } as RideRequest
  }

  async listAll(): Promise<RideRequest[]> {
    const rideRequestsSnapshot = await firestore
      .collection('ride-requests')
      .where('status', '==', RideRequestStatus.Active)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get()
    
    return rideRequestsSnapshot.docs.map(rideRequestDocument => {
      const rideRequestData = rideRequestDocument.data() as any
      return {
        ...rideRequestData,
        id: rideRequestDocument.id,
        departureDate: rideRequestData?.departureDate?.toDate() ?? null,
        deletedAt: rideRequestData?.deletedAt?.toDate() ?? null,
        createdAt: rideRequestData?.createdAt?.toDate() ?? null,
        updatedAt: rideRequestData?.updatedAt?.toDate() ?? null
      } as RideRequest
    })
  }

  async create(newRideRequest: Omit<RideRequest, 'id'>): Promise<RideRequest> {
    const rideRequestDocumentRef = firestore.collection('ride-requests').doc()
    const rideRequestWithId = { ...newRideRequest, id: rideRequestDocumentRef.id }
    await rideRequestDocumentRef.set(rideRequestWithId)
    return rideRequestWithId as RideRequest
  }

  async update(rideRequestId: string, rideRequestUpdates: Partial<RideRequest>): Promise<void> {
    await firestore.collection('ride-requests').doc(rideRequestId).update(rideRequestUpdates)
  }
}

