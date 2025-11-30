export const PAYMENT_REJECTION_REASONS = {
  INSUFFICIENT_AMOUNT: 'insufficient_amount',
  WRONG_IMAGE: 'wrong_image',
  UNCLEAR_RECEIPT: 'unclear_receipt',
  MISMATCHED_NAME: 'mismatched_name',
  OTHER: 'other'
}

export const PAYMENT_REJECTION_MESSAGES = {
  [PAYMENT_REJECTION_REASONS.INSUFFICIENT_AMOUNT]: 'Insufficient payment amount',
  [PAYMENT_REJECTION_REASONS.WRONG_IMAGE]: 'Invalid or incorrect image uploaded',
  [PAYMENT_REJECTION_REASONS.UNCLEAR_RECEIPT]: 'Receipt image is unclear or unreadable',
  [PAYMENT_REJECTION_REASONS.MISMATCHED_NAME]: 'Account name does not match',
  [PAYMENT_REJECTION_REASONS.OTHER]: 'Other reason'
}

export const getRejectionMessage = (reason) => {
  return PAYMENT_REJECTION_MESSAGES[reason] || PAYMENT_REJECTION_MESSAGES[OTHER]
}
