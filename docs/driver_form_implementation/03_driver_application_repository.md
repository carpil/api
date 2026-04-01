# Task 03 — Driver Application Repository

## Contexto
El proyecto usa un patrón repositorio en `src/repositories/firebase/`.
Seguir exactamente el mismo patrón que los repositorios existentes.
Los modelos y schemas ya fueron creados en el Task 01.

## Objetivo
Crear los repositorios de Firestore para `driver_applications` y
`vehicles`, y actualizar el repositorio de `users` para manejar
los nuevos campos de conductor.

## Archivos a crear

- `src/repositories/firebase/driver-application.repository.ts`
- `src/repositories/firebase/vehicle.repository.ts`

## Archivos a modificar

- `src/repositories/firebase/user.repository.ts` — agregar métodos
  para actualizar campos de conductor

---

## Implementación

### `src/repositories/firebase/driver-application.repository.ts`
```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  DriverApplication,
  DriverApplicationStatus,
  DriverApplicationStatusHistory,
  CreateDriverApplicationDto,
  UpdateDriverApplicationDto,
} from '../../models/driver-application.model'

const COLLECTION = 'driver_applications'

export class DriverApplicationRepository {

  async create(dto: CreateDriverApplicationDto): Promise<DriverApplication> {
    const initialHistory: DriverApplicationStatusHistory = {
      status: 'pending',
      changedAt: new Date(),
      changedBy: 'system',
    }

    const docRef = await addDoc(collection(db, COLLECTION), {
      ...dto,
      status: 'pending',
      statusHistory: [initialHistory],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return this.findById(docRef.id) as Promise<DriverApplication>
  }

  async findById(id: string): Promise<DriverApplication | null> {
    const docRef = doc(db, COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as DriverApplication
  }

  async findByUserId(userId: string): Promise<DriverApplication | null> {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const docSnap = snapshot.docs[0]
    return { id: docSnap.id, ...docSnap.data() } as DriverApplication
  }

  async findByStatus(
    status: DriverApplicationStatus
  ): Promise<DriverApplication[]> {
    const q = query(
      collection(db, COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(
      d => ({ id: d.id, ...d.data() } as DriverApplication)
    )
  }

  async findAll(): Promise<DriverApplication[]> {
    const q = query(
      collection(db, COLLECTION),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(
      d => ({ id: d.id, ...d.data() } as DriverApplication)
    )
  }

  async updateStatus(
    id: string,
    status: DriverApplicationStatus,
    changedBy: string,
    note?: string
  ): Promise<void> {
    const historyEntry: DriverApplicationStatusHistory = {
      status,
      changedAt: new Date(),
      changedBy,
      note,
    }

    await updateDoc(doc(db, COLLECTION, id), {
      status,
      reviewedBy: changedBy,
      reviewNote: note ?? null,
      statusHistory: arrayUnion(historyEntry),
      updatedAt: serverTimestamp(),
    })
  }

  async update(id: string, dto: UpdateDriverApplicationDto): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      ...dto,
      updatedAt: serverTimestamp(),
    })
  }
}

export const driverApplicationRepository = new DriverApplicationRepository()
```

### `src/repositories/firebase/vehicle.repository.ts`
```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Vehicle, CreateVehicleDto } from '../../models/vehicle.model'

const COLLECTION = 'vehicles'

export class VehicleRepository {

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...dto,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return this.findById(docRef.id) as Promise<Vehicle>
  }

  async findById(id: string): Promise<Vehicle | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as Vehicle
  }

  async findByUserId(userId: string): Promise<Vehicle | null> {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as Vehicle
  }
}

export const vehicleRepository = new VehicleRepository()
```

### Métodos a agregar en `user.repository.ts`

Agregar estos métodos al repositorio existente sin modificar los
métodos actuales:
```typescript
async setDriverApproved(
  userId: string,
  vehicleId: string,
  applicationId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    isDriver: true,
    driverStatus: 'active',
    vehicleId,
    driverApplicationId: applicationId,
    updatedAt: serverTimestamp(),
  })
}

async updateDriverStatus(
  userId: string,
  status: 'active' | 'suspended' | 'blocked'
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    driverStatus: status,
    updatedAt: serverTimestamp(),
  })
}

async setDriverApplicationId(
  userId: string,
  applicationId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    driverApplicationId: applicationId,
    updatedAt: serverTimestamp(),
  })
}
```

## Criterio de éxito
- Se puede crear una solicitud y recuperarla por userId
- Se puede cambiar el estado con historial automático
- Se puede crear un vehículo vinculado a una solicitud aprobada
- El repositorio de users actualiza correctamente los campos
  de conductor sin afectar campos existentes
- No hay errores TypeScript en ningún archivo