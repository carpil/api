import { firestore } from 'config/firebase'
import { Payment, PaymentStatus, CreatePaymentInput } from '@models/payment.model'

export class PaymentsRepository {
  /**
   * Create a payment record in the rides/{rideId}/payments subcollection
   */
  async createPayment(rideId: string, paymentData: CreatePaymentInput): Promise<Payment> {
    const paymentRef = firestore
      .collection('rides')
      .doc(rideId)
      .collection('payments')
      .doc()
    
    const payment: Payment = {
      id: paymentRef.id,
      rideId,
      userId: paymentData.userId,
      amount: paymentData.amount,
      currency: 'crc',
      status: PaymentStatus.Pending,
      description: paymentData.description,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await paymentRef.set(payment)
    return payment
  }

  /**
   * Get all payments for a specific ride
   */
  async getPaymentsByRide(rideId: string): Promise<Payment[]> {
    const paymentsSnapshot = await firestore
      .collection('rides')
      .doc(rideId)
      .collection('payments')
      .get()
    
    return paymentsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        completedAt: data.completedAt?.toDate()
      } as Payment
    })
  }

  /**
   * Find a payment by Stripe PaymentIntent ID
   */
  async getPaymentByIntentId(paymentIntentId: string): Promise<Payment | null> {
    const paymentsQuery = await firestore
      .collectionGroup('payments')
      .where('stripePaymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get()
    
    if (paymentsQuery.empty) {
      return null
    }
    
    const doc = paymentsQuery.docs[0]
    const data = doc.data()
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      completedAt: data.completedAt?.toDate()
    } as Payment
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(rideId: string, paymentId: string, status: PaymentStatus): Promise<void> {
    const updateData: Partial<Payment> = {
      status,
      updatedAt: new Date()
    }
    
    if (status === PaymentStatus.Succeeded) {
      updateData.completedAt = new Date()
    }
    
    await firestore
      .collection('rides')
      .doc(rideId)
      .collection('payments')
      .doc(paymentId)
      .update(updateData)
  }

  /**
   * Update payment with Stripe PaymentIntent details
   */
  async updatePaymentWithStripeDetails(
    rideId: string, 
    paymentId: string, 
    stripePaymentIntentId: string, 
    stripeClientSecret: string
  ): Promise<void> {
    await firestore
      .collection('rides')
      .doc(rideId)
      .collection('payments')
      .doc(paymentId)
      .update({
        stripePaymentIntentId,
        stripeClientSecret,
        updatedAt: new Date()
      })
  }

  /**
   * Check if all passengers have paid for a ride
   */
  async checkAllPaymentsPaid(rideId: string): Promise<boolean> {
    const payments = await this.getPaymentsByRide(rideId)
    
    if (payments.length === 0) {
      return false
    }
    
    return payments.every(payment => payment.status === PaymentStatus.Succeeded)
  }

  /**
   * Get payment by ride and user
   */
  async getPaymentByRideAndUser(rideId: string, userId: string): Promise<Payment | null> {
    const paymentQuery = await firestore
      .collection('rides')
      .doc(rideId)
      .collection('payments')
      .where('userId', '==', userId)
      .limit(1)
      .get()
    
    if (paymentQuery.empty) {
      return null
    }
    
    const doc = paymentQuery.docs[0]
    const data = doc.data()
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      completedAt: data.completedAt?.toDate()
    } as Payment
  }
}
