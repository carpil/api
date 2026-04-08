import { Response } from 'express'
import { DriverApplicationService } from '../services/driver-application.service'
import { asyncHandler } from '../utils/http'
import { AuthRequest } from '../middlewares/auth.middleware'
import {
  CreateDriverApplicationSchema,
  UpdateDriverApplicationSchema,
  UpdateApplicationStatusSchema,
  PersonalInfoSchema,
  VehicleUpdateSchema,
  DocumentsUpdateSchema,
  DriverApplicationStatus
} from '@models/driver-application.model'

export class DriverApplicationController {
  constructor (private readonly driverApplicationService: DriverApplicationService) {}

  getMyApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await this.driverApplicationService.getMyApplication(req.user?.uid ?? '')
    res.json({ application })
  })

  submitApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = CreateDriverApplicationSchema.parse(req.body)
    const application = await this.driverApplicationService.submitApplication(req.user?.uid ?? '', body)
    res.status(201).json({ application })
  })

  updateMyApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = UpdateDriverApplicationSchema.parse(req.body)
    await this.driverApplicationService.updateMyApplication(req.user?.uid ?? '', body as any)
    res.json({ message: 'Application updated successfully' })
  })

  listAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query
    const applications = status !== undefined
      ? await this.driverApplicationService.listByStatus(status as DriverApplicationStatus)
      : await this.driverApplicationService.listAll()
    res.json({ applications })
  })

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await this.driverApplicationService.getById(req.params.id)
    res.json({ application })
  })

  updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, note } = UpdateApplicationStatusSchema.parse(req.body)
    await this.driverApplicationService.updateStatus(
      req.params.id,
      status,
      req.user?.uid ?? '',
      note
    )
    res.json({ message: 'Status updated successfully' })
  })

  updatePersonalInfo = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = PersonalInfoSchema.parse(req.body)
    await this.driverApplicationService.updatePersonalInfo(req.user?.uid ?? '', body)
    res.json({ message: 'Personal info updated successfully' })
  })

  updateVehicle = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = VehicleUpdateSchema.parse(req.body)
    await this.driverApplicationService.updateVehicle(req.user?.uid ?? '', body)
    res.json({ message: 'Vehicle updated successfully' })
  })

  updateDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = DocumentsUpdateSchema.parse(req.body)
    await this.driverApplicationService.updateDocuments(req.user?.uid ?? '', body)
    res.json({ message: 'Documents updated successfully' })
  })

  uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
    const file = req.file
    if (file == null) {
      res.status(400).json({ message: 'No file provided' })
      return
    }
    const documentType = req.body.documentType as string
    if (documentType == null) {
      res.status(400).json({ message: 'documentType is required' })
      return
    }
    const url = await this.driverApplicationService.uploadDocument(
      req.user?.uid ?? '',
      documentType,
      file
    )
    res.json({ url })
  })

  updateDriverStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.body as { status: 'active' | 'suspended' | 'blocked' }
    await this.driverApplicationService.updateDriverStatus(req.params.userId, status)
    res.json({ message: 'Driver status updated successfully' })
  })
}
