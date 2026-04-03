import { Response } from 'express'
import { DriverApplicationService } from '../services/driver-application.service'
import { asyncHandler } from '../utils/http'
import { AuthRequest } from '../middlewares/auth.middleware'
import {
  CreateDriverApplicationSchema,
  UpdateDriverApplicationSchema,
  UpdateApplicationStatusSchema,
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

  updateDriverStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.body as { status: 'active' | 'suspended' | 'blocked' }
    await this.driverApplicationService.updateDriverStatus(req.params.userId, status)
    res.json({ message: 'Driver status updated successfully' })
  })
}
