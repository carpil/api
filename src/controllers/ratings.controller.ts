import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { RatingsService } from '../services/ratings.service'
import { CreateRatingSchema } from '../models/rating.model'

export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  create = asyncHandler<Request>(async (req: Request, res: Response) => {
    const input = CreateRatingSchema.parse(req.body)
    const rating = await this.ratingsService.create(req.user?.uid ?? '', input)
    res.status(201).json({ message: 'Rating added successfully', rating })
  })

  listPending = asyncHandler<Request>(async (req: Request, res: Response) => {
    const { rideId } = req.params as { rideId: string }
    const result = await this.ratingsService.listPending(rideId, req.user?.uid ?? '')
    res.json(result)
  })
}


