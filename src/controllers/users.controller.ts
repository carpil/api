import { Response } from 'express'
import { asyncHandler } from '../utils/http'
import { UsersService } from '../services/users.service'
import { userSchema } from '../schemas/user'
import { AuthRequest } from '../middlewares/auth.middleware'

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.usersService.getById(req.params.id)
    res.json({ user })
  })

  signup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = userSchema.parse(req.body)
    const user = await this.usersService.signup(req.user!, body as any)
    res.json({ message: 'User created successfully', user })
  })

  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = userSchema.parse(req.body)
    const user = await this.usersService.login(req.user!, body as any)
    res.json({ message: 'User logged in successfully', user })
  })

  loginSocial = asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = userSchema.parse(req.body)
    const user = await this.usersService.loginSocial(req.user!, body as any)
    res.json({ message: 'User logged in successfully', user })
  })

  bootstrap = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.usersService.bootstrap(req.user?.uid ?? '')
    res.json(result)
  })
}


