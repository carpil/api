import { INotificationsRepository } from '@interfaces/repositories.interface'
import { HttpError } from '../utils/http'

export class NotificationsService {
  constructor(private readonly notificationsRepo: INotificationsRepository) {}

  async addToken(currentUserId: string, pushToken: string) {
    if (!currentUserId) throw new HttpError(401, 'Unauthorized')
    
    await this.notificationsRepo.addToken(currentUserId, pushToken)
    return { pushToken }
  }

  async removeToken(currentUserId: string, pushToken: string) {
    if (!currentUserId) throw new HttpError(401, 'Unauthorized')
    
    await this.notificationsRepo.removeToken(currentUserId, pushToken)
    return { pushToken }
  }
}


