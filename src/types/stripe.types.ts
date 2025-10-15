/**
 * Stripe-related type definitions
 */

/**
 * Metadata attached to Stripe PaymentIntents
 * This ensures type safety and consistency across the application
 * 
 * Note: Extends Record<string, string> to be compatible with Stripe's MetadataParam
 */
export interface StripePaymentMetadata extends Record<string, string> {
  /**
   * The ride ID associated with this payment
   */
  rideId: string

  /**
   * The payment document ID in Firestore
   */
  paymentId: string

  /**
   * The user ID making the payment
   */
  userId: string

  // Add future metadata fields here as needed (must be strings)
  // Example:
  // driverId?: string
  // passengerCount?: string
  // promoCode?: string
}

/**
 * Type guard to check if metadata contains required payment fields
 */
export function hasPaymentMetadata(
  metadata?: Record<string, any>
): metadata is StripePaymentMetadata {
  return (
    !!metadata &&
    typeof metadata.rideId === 'string' &&
    typeof metadata.paymentId === 'string' &&
    typeof metadata.userId === 'string'
  )
}

/**
 * Extract payment metadata from Stripe metadata object
 * Returns undefined if required fields are missing
 */
export function extractPaymentMetadata(
  metadata?: Record<string, any>
): StripePaymentMetadata | undefined {
  if (!hasPaymentMetadata(metadata)) {
    return undefined
  }
  return {
    rideId: metadata.rideId,
    paymentId: metadata.paymentId,
    userId: metadata.userId
  }
}

