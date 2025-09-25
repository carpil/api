import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { UsersService } from '../services/users.service'
import { userSchema } from '../schemas/user'

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  getById = asyncHandler<Request>(async (req: Request, res: Response) => {
    const user = await this.usersService.getById(req.params.id)
    res.json({ user })
  })

  signup = asyncHandler<Request>(async (req: Request, res: Response) => {
    const body = userSchema.parse(req.body)
    const user = await this.usersService.signup(req.user!, body as any)
    res.json({ message: 'User created successfully', user })
  })

  login = asyncHandler<Request>(async (req: Request, res: Response) => {
    const body = userSchema.parse(req.body)
    const user = await this.usersService.login(req.user!, body as any)
    res.json({ message: 'User logged in successfully', user })
  })

  loginSocial = asyncHandler<Request>(async (req: Request, res: Response) => {
    const body = userSchema.parse(req.body)
    const user = await this.usersService.loginSocial(req.user!, body as any)
    res.json({ message: 'User logged in successfully', user })
  })
}


