import { firestore } from 'config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import {
  DriverApplication,
  DriverApplicationStatus,
  DriverApplicationStatusHistory,
  CreateDriverApplicationDto,
  UpdateDriverApplicationDto
} from '@models/driver-application.model'

const COLLECTION = 'driver_applications'

export class DriverApplicationRepository {
  async create (dto: CreateDriverApplicationDto): Promise<DriverApplication> {
    const isComplete = dto.vehicle != null && dto.documents != null
    const initialStatus = isComplete ? 'pending' : 'draft'
    const initialStep = isComplete ? 3 : dto.vehicle != null ? 2 : 1

    const initialHistory: DriverApplicationStatusHistory = {
      status: initialStatus,
      changedAt: new Date(),
      changedBy: 'system'
    }

    const docRef = await firestore.collection(COLLECTION).add({
      ...dto,
      vehicle: dto.vehicle ?? null,
      documents: dto.documents ?? { cedulaFront: '', cedulaBack: '', vehicleRegistration: '' },
      status: initialStatus,
      currentStep: initialStep,
      statusHistory: [initialHistory],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return this.findById(docRef.id) as Promise<DriverApplication>
  }

  async findById (id: string): Promise<DriverApplication | null> {
    const snapshot = await firestore.collection(COLLECTION).doc(id).get()
    if (!snapshot.exists) return null
    return this.mapDoc(snapshot)
  }

  async findByUserId (userId: string): Promise<DriverApplication | null> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    if (snapshot.empty) return null
    return this.mapDoc(snapshot.docs[0])
  }

  async findByStatus (status: DriverApplicationStatus): Promise<DriverApplication[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where('status', '==', status)
      .orderBy('createdAt', 'asc')
      .get()

    return snapshot.docs.map(d => this.mapDoc(d))
  }

  async findAll (): Promise<DriverApplication[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(d => this.mapDoc(d))
  }

  async updateStatus (
    id: string,
    status: DriverApplicationStatus,
    changedBy: string,
    note?: string
  ): Promise<void> {
    const historyEntry: DriverApplicationStatusHistory = {
      status,
      changedAt: new Date(),
      changedBy,
      note
    }

    await firestore.collection(COLLECTION).doc(id).update({
      status,
      reviewedBy: changedBy,
      reviewNote: note ?? null,
      statusHistory: FieldValue.arrayUnion(historyEntry),
      updatedAt: FieldValue.serverTimestamp()
    })
  }

  async update (id: string, dto: UpdateDriverApplicationDto): Promise<void> {
    await firestore.collection(COLLECTION).doc(id).update({
      ...dto,
      updatedAt: FieldValue.serverTimestamp()
    })
  }

  async updatePersonalInfo (
    id: string,
    data: { fullName: string, cedula: string, address: string, whatsapp: string }
  ): Promise<void> {
    await firestore.collection(COLLECTION).doc(id).update({
      ...data,
      currentStep: 1,
      updatedAt: FieldValue.serverTimestamp()
    })
  }

  async updateVehicle (
    id: string,
    vehicle: { brand: string, model: string, year: number, color: string, plate: string, availableSeats: number }
  ): Promise<void> {
    await firestore.collection(COLLECTION).doc(id).update({
      vehicle,
      currentStep: 2,
      updatedAt: FieldValue.serverTimestamp()
    })
  }

  async updateDocuments (
    id: string,
    documents: { cedulaFront: string, cedulaBack: string, vehicleRegistration: string, criminalRecord?: string, selfie?: string }
  ): Promise<void> {
    const historyEntry: DriverApplicationStatusHistory = {
      status: 'pending',
      changedAt: new Date(),
      changedBy: 'applicant'
    }

    await firestore.collection(COLLECTION).doc(id).update({
      documents,
      status: 'pending',
      currentStep: 3,
      statusHistory: FieldValue.arrayUnion(historyEntry),
      updatedAt: FieldValue.serverTimestamp()
    })
  }

  private mapDoc (doc: FirebaseFirestore.DocumentSnapshot): DriverApplication {
    const data = doc.data() as any
    return {
      ...data,
      id: doc.id,
      createdAt: data?.createdAt?.toDate() ?? null,
      updatedAt: data?.updatedAt?.toDate() ?? null,
      statusHistory: (data?.statusHistory ?? []).map((h: any) => ({
        ...h,
        changedAt: h?.changedAt?.toDate ? h.changedAt.toDate() : new Date(h.changedAt)
      }))
    } as DriverApplication
  }
}

export const driverApplicationRepository = new DriverApplicationRepository()
