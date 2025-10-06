import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { PaymentsController } from '../../controllers/payments.controller'
import { PaymentsService } from '../../services/payments.service'

const router = Router()

const paymentsController = new PaymentsController(new PaymentsService())

// Crear un PaymentIntent para un pago único
router.post('/create-intent', authenticate, paymentsController.createPaymentIntent)

// Confirma un PaymentIntent
router.post('/confirm/:paymentIntentId', authenticate, paymentsController.confirmPayment)

// Cancela un PaymentIntent
router.post('/cancel/:paymentIntentId', authenticate, paymentsController.cancelPayment)

// Obtiene el estado de un PaymentIntent
router.get('/status/:paymentIntentId', authenticate, paymentsController.getPaymentStatus)

export default router
