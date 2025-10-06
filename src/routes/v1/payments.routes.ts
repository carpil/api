import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { PaymentsController } from '../../controllers/payments.controller'
import { PaymentsService } from '../../services/payments.service'

const router = Router()

let paymentsController: PaymentsController

const getPaymentsController = () => {
  if (!paymentsController) {
    paymentsController = new PaymentsController(new PaymentsService())
  }
  return paymentsController
}

// Crear un PaymentIntent para un pago único
router.post('/create-intent', authenticate, (req, res, next) => 
  getPaymentsController().createPaymentIntent(req, res, next)
)

// Confirma un PaymentIntent
router.post('/confirm/:paymentIntentId', authenticate, (req, res, next) =>
  getPaymentsController().confirmPayment(req, res, next)
)

// Cancela un PaymentIntent
router.post('/cancel/:paymentIntentId', authenticate, (req, res, next) =>
  getPaymentsController().cancelPayment(req, res, next)
)

// Obtiene el estado de un PaymentIntent
router.get('/status/:paymentIntentId', authenticate, (req, res, next) =>
  getPaymentsController().getPaymentStatus(req, res, next)
)

export default router
