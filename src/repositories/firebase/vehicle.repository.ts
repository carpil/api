import { firestore } from 'config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { Vehicle, CreateVehicleDto } from '@models/vehicle.model'

const COLLECTION = 'vehicles'

export class VehicleRepository {
  async create (dto: CreateVehicleDto): Promise<Vehicle> {
    const docRef = await firestore.collection(COLLECTION).add({
      ...dto,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return this.findById(docRef.id) as Promise<Vehicle>
  }

  async findById (id: string): Promise<Vehicle | null> {
    const snapshot = await firestore.collection(COLLECTION).doc(id).get()
    if (!snapshot.exists) return null
    return this.mapDoc(snapshot)
  }

  async findByUserId (userId: string): Promise<Vehicle | null> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .limit(1)
      .get()

    if (snapshot.empty) return null
    return this.mapDoc(snapshot.docs[0])
  }

  private mapDoc (doc: FirebaseFirestore.DocumentSnapshot): Vehicle {
    const data = doc.data() as any
    return {
      ...data,
      id: doc.id,
      createdAt: data?.createdAt?.toDate() ?? null,
      updatedAt: data?.updatedAt?.toDate() ?? null
    } as Vehicle
  }
}

export const vehicleRepository = new VehicleRepository()
