import { DriverApplicationRepository } from '../repositories/firebase/driver-application.repository'
import { VehicleRepository } from '../repositories/firebase/vehicle.repository'
import { IUsersRepository } from '@interfaces/repositories.interface'
import {
  DriverApplication,
  DriverApplicationStatus,
  DriverApplicationVehicle,
  DriverApplicationDocument,
  CreateDriverApplicationDto
} from '@models/driver-application.model'
import { uploadToStorage } from '../utils/storage'

export class DriverApplicationService {
  constructor (
    private readonly driverApplicationRepo: DriverApplicationRepository,
    private readonly vehicleRepo: VehicleRepository,
    private readonly usersRepo: IUsersRepository
  ) {}

  async getMyApplication (userId: string): Promise<DriverApplication | null> {
    return this.driverApplicationRepo.findByUserId(userId)
  }

  async getById (id: string): Promise<DriverApplication> {
    const application = await this.driverApplicationRepo.findById(id)
    if (application === null) throw new Error('Application not found')
    return application
  }

  async listAll (): Promise<DriverApplication[]> {
    return this.driverApplicationRepo.findAll()
  }

  async listByStatus (status: DriverApplicationStatus): Promise<DriverApplication[]> {
    return this.driverApplicationRepo.findByStatus(status)
  }

  async submitApplication (
    userId: string,
    dto: Omit<CreateDriverApplicationDto, 'userId'>
  ): Promise<DriverApplication> {
    const existing = await this.driverApplicationRepo.findByUserId(userId)
    if (existing !== null && existing.status !== 'rejected' && existing.status !== 'draft') {
      throw new Error('Ya tenés una solicitud activa. Esperá a que sea procesada.')
    }

    const application = await this.driverApplicationRepo.create({ ...dto, userId })
    await this.usersRepo.setDriverApplicationId(userId, application.id)
    return application
  }

  async updateMyApplication (
    userId: string,
    dto: Omit<CreateDriverApplicationDto, 'userId'>
  ): Promise<void> {
    const existing = await this.driverApplicationRepo.findByUserId(userId)
    if (existing === null) throw new Error('Application not found')
    if (existing.status !== 'changes_requested' && existing.status !== 'draft') {
      throw new Error('Solo podés editar tu solicitud cuando se requieren cambios.')
    }
    await this.driverApplicationRepo.update(existing.id, dto)
  }

  async updateStatus (
    applicationId: string,
    status: DriverApplicationStatus,
    adminId: string,
    note?: string
  ): Promise<void> {
    const application = await this.driverApplicationRepo.findById(applicationId)
    if (application === null) throw new Error('Application not found')

    await this.driverApplicationRepo.updateStatus(applicationId, status, adminId, note)

    if (status === 'approved') {
      await this.approveDriver(application, adminId)
    }
  }

  async updatePersonalInfo (
    userId: string,
    data: { fullName: string, cedula: string, address: string, whatsapp: string }
  ): Promise<void> {
    const existing = await this.driverApplicationRepo.findByUserId(userId)
    if (existing === null) throw new Error('Application not found')
    if (existing.status !== 'draft' && existing.status !== 'changes_requested') {
      throw new Error('Solo podés editar tu solicitud en estado borrador o cambios solicitados.')
    }
    await this.driverApplicationRepo.updatePersonalInfo(existing.id, data)
  }

  async updateVehicle (
    userId: string,
    vehicle: DriverApplicationVehicle
  ): Promise<void> {
    const existing = await this.driverApplicationRepo.findByUserId(userId)
    if (existing === null) throw new Error('Application not found')
    if (existing.status !== 'draft' && existing.status !== 'changes_requested') {
      throw new Error('Solo podés editar tu solicitud en estado borrador o cambios solicitados.')
    }
    await this.driverApplicationRepo.updateVehicle(existing.id, vehicle)
  }

  async updateDocuments (
    userId: string,
    documents: DriverApplicationDocument
  ): Promise<void> {
    const existing = await this.driverApplicationRepo.findByUserId(userId)
    if (existing === null) throw new Error('Application not found')
    if (existing.status !== 'draft' && existing.status !== 'changes_requested') {
      throw new Error('Solo podés editar tu solicitud en estado borrador o cambios solicitados.')
    }
    await this.driverApplicationRepo.updateDocuments(existing.id, documents)
  }

  async uploadDocument (
    userId: string,
    documentType: string,
    file: Express.Multer.File
  ): Promise<string> {
    const existing = await this.driverApplicationRepo.findByUserId(userId)
    if (existing === null) throw new Error('Application not found')
    if (existing.status !== 'draft' && existing.status !== 'changes_requested') {
      throw new Error('Solo podés subir documentos en estado borrador o cambios solicitados.')
    }

    const extension = file.mimetype === 'application/pdf' ? 'pdf' : 'jpg'
    const path = `driver-documents/${userId}/${existing.id}/${documentType}.${extension}`

    const url = await uploadToStorage(path, file.buffer, file.mimetype)
    return url
  }

  async updateDriverStatus (
    userId: string,
    status: 'active' | 'suspended' | 'blocked'
  ): Promise<void> {
    await this.usersRepo.updateDriverStatus(userId, status)
  }

  private async approveDriver (application: DriverApplication, _adminId: string): Promise<void> {
    const vehicle = await this.vehicleRepo.create({
      userId: application.userId,
      applicationId: application.id,
      ...application.vehicle
    })

    await this.usersRepo.setDriverApproved(application.userId, vehicle.id, application.id)
  }
}
