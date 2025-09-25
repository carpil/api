import { Request, Response } from 'express'
import { RidesService } from '../services/rides.service'
import { asyncHandler } from '../utils/http'
import { CreateRideSchema } from '../models/ride.model'
import { AuthRequest } from '../middlewares/auth.middleware'

export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  listDrivers = asyncHandler(async (_req: Request, res: Response) => {
    const rides = await this.ridesService.listDriverRides()
    res.json({ rides })
  })

  getById = asyncHandler(async (req: Request, res: Response) => {
    const ride = await this.ridesService.getRideById(req.params.id)
    res.json({ ride })
  })

  create = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    const input = CreateRideSchema.parse(req.body)
    const userId = req.user?.uid
    const ride = await this.ridesService.createRide(userId ?? '', input)
    res.status(201).json({ ride })
  })

  join = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    await this.ridesService.joinRide(req.params.id, req.user?.uid ?? '')
    res.json({ message: 'Successfully joined the ride' })
  })

  start = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    await this.ridesService.startRide(req.params.id, req.user?.uid ?? '')
    res.json({ message: 'Ride started successfully' })
  })

  complete = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    await this.ridesService.completeRide(req.params.id, req.user?.uid ?? '')
    res.json({ message: 'Ride completed successfully' })
  })
}


