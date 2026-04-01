# Task 01 — Driver Application Schema

## Contexto
El proyecto usa Firebase Firestore con un patrón repositorio que permite
migración futura a PostgreSQL o MongoDB. Los modelos TypeScript están en
`src/models/` y las validaciones Zod en `src/schemas/`. Los repositorios
están en `src/repositories/firebase/`.

Actualmente NO existe ninguna colección ni modelo para conductores,
vehículos o solicitudes de aprobación. Todo debe crearse desde cero
siguiendo el patrón existente en el proyecto.

## Objetivo
Crear los modelos TypeScript, schemas Zod y tipos necesarios para el
feature de aprobación de conductores.

## Archivos a crear

- `src/models/driver-application.model.ts`
- `src/models/vehicle.model.ts`
- `src/schemas/driver-application.schema.ts`
- `src/schemas/vehicle.schema.ts`

## Archivos a modificar

- `src/models/user.model.ts` — agregar campos de conductor
- `src/schemas/user.schema.ts` — agregar validaciones de campos nuevos

---

## Implementación

### `src/models/driver-application.model.ts`
```typescript
export type DriverApplicationStatus =
  | 'pending'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'

export interface DriverApplicationDocument {
  cedulaFront: string        // URL Firebase Storage
  cedulaBack: string         // URL Firebase Storage
  vehicleRegistration: string // URL Firebase Storage
  criminalRecord?: string    // URL Firebase Storage (opcional)
}

export interface DriverApplicationStatusHistory {
  status: DriverApplicationStatus
  changedAt: Date
  changedBy: string          // 'system' o ID del admin
  note?: string
}

export interface DriverApplicationVehicle {
  brand: string
  model: string
  year: number
  color: string
  plate: string
  availableSeats: number     // 1–4
}

export interface DriverApplication {
  id: string
  userId: string

  // Paso 1 — Datos personales
  fullName: string
  cedula: string
  address: string
  whatsapp: string

  // Paso 2 — Datos del vehículo
  vehicle: DriverApplicationVehicle

  // Paso 3 — Documentos
  documents: DriverApplicationDocument

  // Estado y auditoría
  status: DriverApplicationStatus
  reviewedBy?: string
  reviewNote?: string
  statusHistory: DriverApplicationStatusHistory[]

  createdAt: Date
  updatedAt: Date
}

export type CreateDriverApplicationDto = Omit
  DriverApplication,
  'id' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'
>

export type UpdateDriverApplicationDto = Partial
  Pick
    DriverApplication,
    'status' | 'reviewedBy' | 'reviewNote' | 'documents' |
    'vehicle' | 'fullName' | 'cedula' | 'address' | 'whatsapp'
  >
>
```

### `src/models/vehicle.model.ts`
```typescript
export interface Vehicle {
  id: string
  userId: string
  applicationId: string
  brand: string
  model: string
  year: number
  color: string
  plate: string
  availableSeats: number
  createdAt: Date
  updatedAt: Date
}

export type CreateVehicleDto = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>
```

### Modificaciones en `src/models/user.model.ts`

Agregar estos campos opcionales a la interfaz `User` existente:
```typescript
// Campos de conductor — agregar a la interfaz User existente
isDriver?: boolean
driverStatus?: 'active' | 'suspended' | 'blocked'
vehicleId?: string
driverApplicationId?: string
stripeConnectAccountId?: string
```

### `src/schemas/driver-application.schema.ts`
```typescript
import { z } from 'zod'

export const driverApplicationVehicleSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1).max(50),
  plate: z.string().min(1).max(20),
  availableSeats: z.number().int().min(1).max(4),
})

export const driverApplicationDocumentSchema = z.object({
  cedulaFront: z.string().url(),
  cedulaBack: z.string().url(),
  vehicleRegistration: z.string().url(),
  criminalRecord: z.string().url().optional(),
})

export const createDriverApplicationSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().min(1).max(200),
  cedula: z.string().min(9).max(12),
  address: z.string().min(1).max(500),
  whatsapp: z.string().min(8).max(20),
  vehicle: driverApplicationVehicleSchema,
  documents: driverApplicationDocumentSchema,
})

export const updateDriverApplicationSchema = z.object({
  status: z.enum([
    'pending',
    'in_review',
    'changes_requested',
    'approved',
    'rejected',
  ]).optional(),
  reviewedBy: z.string().optional(),
  reviewNote: z.string().max(1000).optional(),
  documents: driverApplicationDocumentSchema.optional(),
  vehicle: driverApplicationVehicleSchema.optional(),
  fullName: z.string().min(1).max(200).optional(),
  cedula: z.string().min(9).max(12).optional(),
  address: z.string().min(1).max(500).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
})
```

### `src/schemas/vehicle.schema.ts`
```typescript
import { z } from 'zod'

export const createVehicleSchema = z.object({
  userId: z.string().min(1),
  applicationId: z.string().min(1),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1).max(50),
  plate: z.string().min(1).max(20),
  availableSeats: z.number().int().min(1).max(4),
})
```

## Criterio de éxito
- Todos los archivos compilan sin errores TypeScript
- Los schemas Zod validan correctamente los datos
- Los campos nuevos en `user.model.ts` son opcionales y no rompen
  nada existente
- No se modificó ningún otro archivo del proyecto