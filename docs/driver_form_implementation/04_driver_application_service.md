# Task 04 — Driver Application Service

## Contexto
Los repositorios ya existen del Task 03. Este task crea la capa
de servicio que orquesta la lógica de negocio del flujo de
aprobación de conductor. Seguir el patrón de servicios existente
en el proyecto.

## Objetivo
Crear el servicio que maneja todo el flujo de aprobación:
crear solicitud, cambiar estados, aprobar conductor y crear vehículo.

## Archivos a crear

- `src/services/driver-application.service.ts`

---

## Implementación

### `src/services/driver-application.service.ts`
```typescript
import { driverApplicationRepository } from '../repositories/firebase/driver-application.repository'
import { vehicleRepository } from '../repositories/firebase/vehicle.repository'
import { userRepository } from '../repositories/firebase/user.repository'
import { documentUploadService } from './document-upload.service'
import {
  DriverApplication,
  DriverApplicationStatus,
  CreateDriverApplicationDto,
} from '../models/driver-application.model'

export interface SubmitApplicationParams {
  userId: string
  fullName: string
  cedula: string
  address: string
  whatsapp: string
  vehicle: {
    brand: string
    model: string
    year: number
    color: string
    plate: string
    availableSeats: number
  }
  documents: {
    cedulaFront: { file: File | Blob; mimeType: string }
    cedulaBack: { file: File | Blob; mimeType: string }
    vehicleRegistration: { file: File | Blob; mimeType: string }
    criminalRecord?: { file: File | Blob; mimeType: string }
  }
}

export class DriverApplicationService {

  // Verifica si el usuario ya tiene una solicitud activa
  async getActiveApplication(
    userId: string
  ): Promise<DriverApplication | null> {
    return driverApplicationRepository.findByUserId(userId)
  }

  // Envía una nueva solicitud completa
  async submitApplication(
    params: SubmitApplicationParams
  ): Promise<DriverApplication> {
    // Verificar que no tenga solicitud activa no rechazada
    const existing = await driverApplicationRepository.findByUserId(
      params.userId
    )
    if (existing && existing.status !== 'rejected') {
      throw new Error(
        'Ya tenés una solicitud activa. Esperá a que sea procesada.'
      )
    }

    // Crear solicitud temporal para obtener el ID
    // y usarlo en la ruta de Storage
    const tempDto: CreateDriverApplicationDto = {
      userId: params.userId,
      fullName: params.fullName,
      cedula: params.cedula,
      address: params.address,
      whatsapp: params.whatsapp,
      vehicle: params.vehicle,
      documents: {
        cedulaFront: '',
        cedulaBack: '',
        vehicleRegistration: '',
      },
    }

    const application = await driverApplicationRepository.create(tempDto)

    // Subir documentos con el ID real de la solicitud
    const documentUrls = await documentUploadService.uploadAllDocuments(
      params.userId,
      application.id,
      params.documents
    )

    // Actualizar la solicitud con las URLs de los documentos
    await driverApplicationRepository.update(application.id, {
      documents: documentUrls,
    })

    // Vincular la solicitud al usuario
    await userRepository.setDriverApplicationId(
      params.userId,
      application.id
    )

    return driverApplicationRepository.findById(
      application.id
    ) as Promise<DriverApplication>
  }

  // Cambia el estado de una solicitud (usado desde backoffice)
  async updateStatus(
    applicationId: string,
    status: DriverApplicationStatus,
    adminId: string,
    note?: string
  ): Promise<void> {
    const application = await driverApplicationRepository.findById(
      applicationId
    )
    if (!application) throw new Error('Solicitud no encontrada')

    await driverApplicationRepository.updateStatus(
      applicationId,
      status,
      adminId,
      note
    )

    // Si se aprueba, crear el vehículo y actualizar el usuario
    if (status === 'approved') {
      await this.approveDriver(application, adminId)
    }
  }

  // Lógica de aprobación — crea vehículo y activa al conductor
  private async approveDriver(
    application: DriverApplication,
    adminId: string
  ): Promise<void> {
    const vehicle = await vehicleRepository.create({
      userId: application.userId,
      applicationId: application.id,
      ...application.vehicle,
    })

    await userRepository.setDriverApproved(
      application.userId,
      vehicle.id,
      application.id
    )
  }

  // Suspende o bloquea a un conductor (usado desde backoffice)
  async updateDriverStatus(
    userId: string,
    status: 'active' | 'suspended' | 'blocked'
  ): Promise<void> {
    await userRepository.updateDriverStatus(userId, status)
  }
}

export const driverApplicationService = new DriverApplicationService()
```

## Criterio de éxito
- `submitApplication` crea la solicitud, sube los documentos
  y vincula al usuario en una sola llamada
- `updateStatus` con `approved` crea el vehículo y activa
  al conductor automáticamente
- Si el usuario ya tiene una solicitud activa, lanza error claro
- No hay errores TypeScript