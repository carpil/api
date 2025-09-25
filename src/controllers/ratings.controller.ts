import { Response } from 'express'
import { asyncHandler } from '../utils/http'
import { RatingsService } from '../services/ratings.service'
import { CreateRatingSchema } from '../models/rating.model'
import { AuthRequest } from '../middlewares/auth.middleware'

export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = CreateRatingSchema.parse(req.body)
    const rating = await this.ratingsService.create(req.user?.uid ?? '', input)
    res.status(201).json({ message: 'Rating added successfully', rating })
  })

  listPending = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { rideId } = req.params as { rideId: string }
    const result = await this.ratingsService.listPending(rideId, req.user?.uid ?? '')
    res.json(result)
  })
}


