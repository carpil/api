import { firestore } from '../config/firebase'
import { Ride } from '../models/ride'

export async function getRide({ id }: { id: string }): Promise<Ride | null> {
  try {
    const rideRef = await firestore.collection('rides').doc(id).get()
    if (!rideRef.exists) {
      return null
    }

    const rideData = rideRef.data()
    const ride: Ride = {
      id: rideRef.id,
      origin: rideData?.origin ?? null,
      destination: rideData?.destination ?? null,
      meetingPoint: rideData?.meetingPoint ?? null,
      availableSeats: rideData?.availableSeats ?? 0,
      price: rideData?.price ?? 0,
      passengers: rideData?.passengers ?? [],
      driver: rideData?.driver ?? null,
      chatId: rideData?.chatId ?? '',
      departureDate: rideData?.departureDate?.toDate() ?? null,
      deletedAt: rideData?.deletedAt?.toDate() ?? null,
      createdAt: rideData?.createdAt?.toDate() ?? null,
      updatedAt: rideData?.updatedAt?.toDate() ?? null
    }

    return ride
  } catch (error) {
    console.error('Error getting ride:', error)
    return null
  }
} 