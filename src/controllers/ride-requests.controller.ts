import { Response } from 'express'
import { RideRequestsService } from '../services/ride-requests.service'
import { asyncHandler } from '../utils/http'
import { CreateRideRequestSchema } from '../models/ride-request'
import { AuthRequest } from '../middlewares/auth.middleware'

export class RideRequestsController {
  constructor(private readonly rideRequestsService: RideRequestsService) {}

  list = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const rideRequests = await this.rideRequestsService.listAllRideRequests()
    res.json({ rideRequests })
  })

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const rideRequest = await this.rideRequestsService.getRideRequestById(req.params.id)
    res.json({ rideRequest })
  })

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = CreateRideRequestSchema.parse(req.body)
    const userId = req.user?.uid
    const rideRequest = await this.rideRequestsService.createRideRequest(userId ?? '', input)
    res.status(201).json({ rideRequest })
  })

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.rideRequestsService.deleteRideRequest(req.params.id, req.user?.uid ?? '')
    res.json({ message: 'Ride request deleted successfully' })
  })
}

