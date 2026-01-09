import { RideRequestsRepository } from '../repositories/firebase/ride-requests.repository'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { CreateRideRequestInput, RideRequest, RideRequestStatus } from '../models/ride-request'
import { HttpError } from '../utils/http'

export class RideRequestsService {
  constructor(
    private readonly rideRequestsRepo: RideRequestsRepository,
    private readonly usersRepo: UsersRepository
  ) {}

  async createRideRequest(creatorId: string, rideRequestData: CreateRideRequestInput): Promise<RideRequest> {
    if (!creatorId) throw new HttpError(401, 'Unauthorized')

    const creator = await this.usersRepo.getById(creatorId)
    if (!creator) throw new HttpError(404, 'Creator not found')
    const creatorInfo = { id: creator.id, name: creator.name, profilePicture: creator.profilePicture }

    const newRideRequest: Omit<RideRequest, 'id'> = {
      ...rideRequestData,
      creator: creatorInfo,
      deletedAt: null,
      status: RideRequestStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createdRideRequest = await this.rideRequestsRepo.create(newRideRequest)
    return createdRideRequest
  }

  async listAllRideRequests(): Promise<RideRequest[]> {
    return this.rideRequestsRepo.listAll()
  }

  async getRideRequestById(id: string): Promise<RideRequest> {
    const rideRequest = await this.rideRequestsRepo.getById(id)
    if (!rideRequest) throw new HttpError(404, 'Ride request not found')
    return rideRequest
  }

  async deleteRideRequest(id: string, userId: string): Promise<void> {
    if (!userId) throw new HttpError(401, 'Unauthorized')

    const rideRequest = await this.getRideRequestById(id)

    if (rideRequest.creator.id !== userId) {
      throw new HttpError(403, 'You are not authorized to delete this ride request')
    }

    if (rideRequest.deletedAt !== null) {
      throw new HttpError(400, 'Ride request is already deleted')
    }

    if (rideRequest.status === RideRequestStatus.Canceled) {
      throw new HttpError(400, 'Ride request is already canceled')
    }

    await this.rideRequestsRepo.delete(id)
  }
}

