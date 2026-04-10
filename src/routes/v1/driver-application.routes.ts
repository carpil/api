import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../../middlewares/auth.middleware'
import { DriverApplicationController } from '../../controllers/driver-application.controller'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const createDriverApplicationRouter = (controller: DriverApplicationController) => {
  const router = Router()

  // User routes
  router.get('/me', authenticate, (req, res, next) => controller.getMyApplication(req, res, next))
  router.post('/', authenticate, (req, res, next) => controller.submitApplication(req, res, next))
  router.patch('/me', authenticate, (req, res, next) => controller.updateMyApplication(req, res, next))
  router.patch('/me/personal-info', authenticate, (req, res, next) => controller.updatePersonalInfo(req, res, next))
  router.patch('/me/vehicle', authenticate, (req, res, next) => controller.updateVehicle(req, res, next))
  router.patch('/me/documents', authenticate, (req, res, next) => controller.updateDocuments(req, res, next))
  router.post('/me/upload', authenticate, upload.single('file'), (req, res, next) => controller.uploadDocument(req, res, next))

  // Admin routes
  router.get('/', authenticate, (req, res, next) => controller.listAll(req, res, next))
  router.get('/:id', authenticate, (req, res, next) => controller.getById(req, res, next))
  router.patch('/:id/status', authenticate, (req, res, next) => controller.updateStatus(req, res, next))
  router.patch('/users/:userId/driver-status', authenticate, (req, res, next) => controller.updateDriverStatus(req, res, next))

  return router
}

export default createDriverApplicationRouter
