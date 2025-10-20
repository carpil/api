import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { PaymentsController } from '../../controllers/payments.controller'

const createPaymentsRouter = (paymentsController: PaymentsController) => {
  const router = Router()

  // Crear un PaymentIntent para un pago único
  router.post('/create-intent', authenticate, (req, res, next) => 
    paymentsController.createPaymentIntent(req, res, next)
  )

  // Confirma un PaymentIntent
  router.post('/confirm/:paymentIntentId', authenticate, (req, res, next) =>
    paymentsController.confirmPayment(req, res, next)
  )

  // Cancela un PaymentIntent
  router.post('/cancel/:paymentIntentId', authenticate, (req, res, next) =>
    paymentsController.cancelPayment(req, res, next)
  )

  // Obtiene el estado de un PaymentIntent
  router.get('/status/:paymentIntentId', authenticate, (req, res, next) =>
    paymentsController.getPaymentStatus(req, res, next)
  )

  // Recover a payment by syncing with Stripe's actual status
  router.post('/recover/:paymentIntentId', authenticate, (req, res, next) =>
    paymentsController.recoverPayment(req, res, next)
  )

  // Complete a SINPE payment
  router.post('/complete-sinpe', authenticate, (req, res, next) =>
    paymentsController.completeSinpePayment(req, res, next)
  )

  return router
}

export default createPaymentsRouter
