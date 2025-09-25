import { UsersRepository } from '../repositories/firebase/users.repository'
import { HttpError } from '../utils/http'
import { User } from '@models/user'

export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async signup(currentUser: { uid: string, email?: string }, input: User) {
    if (!currentUser?.uid || input.id !== currentUser.uid) throw new HttpError(401, 'Unauthorized')
    if (currentUser.email && input.email && input.email !== currentUser.email) throw new HttpError(401, 'Unauthorized')

    const exists = await this.usersRepo.exists(input.id)
    if (exists) throw new HttpError(400, 'User already exists')

    const toSave: User = {
      ...input,
      id: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    await this.usersRepo.create(currentUser.uid, toSave)
    return toSave
  }

  async login(currentUser: { uid: string, email?: string }, input: User) {
    if (!currentUser?.uid || input.id !== currentUser.uid) throw new HttpError(401, 'Unauthorized')
    if (currentUser.email && input.email && input.email !== currentUser.email) throw new HttpError(401, 'Unauthorized')

    const user = await this.usersRepo.getById(currentUser.uid)
    if (!user) throw new HttpError(404, 'User not found')
    return {
      ...user,
      id: currentUser.uid,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt ?? new Date()
    }
  }

  async loginSocial(currentUser: { uid: string, email?: string }, input: User) {
    if (!currentUser?.uid || input.id !== currentUser.uid) throw new HttpError(401, 'Unauthorized')
    if (currentUser.email && input.email && input.email !== currentUser.email) throw new HttpError(401, 'Unauthorized')

    const existing = await this.usersRepo.getById(currentUser.uid)
    if (!existing) {
      const toSave: User = {
        ...input,
        id: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await this.usersRepo.create(currentUser.uid, toSave)
      return toSave
    }

    return {
      ...existing,
      id: currentUser.uid,
      createdAt: existing.createdAt ?? new Date(),
      updatedAt: existing.updatedAt ?? new Date()
    }
  }

  async getById(id: string) {
    const u = await this.usersRepo.getById(id)
    if (!u) throw new HttpError(404, 'User not found')
    return u
  }
}


