export const ORDER_REOPENING_REASONS = {
  MISSED_DEADLINE: 'missed_deadline',
  TECHNICAL_ISSUE: 'technical_issue',
  PAYMENT_DELAY: 'payment_delay',
  FORGOT_UPLOAD: 'forgot_upload',
  NETWORK_ISSUE: 'network_issue',
  BUSY_SCHEDULE: 'busy_schedule',
  EMERGENCY: 'emergency',
  MISUNDERSTOOD_TIMER: 'misunderstood_timer',
  OTHER: 'other'
};

export const ORDER_REOPENING_MESSAGES = {
  [ORDER_REOPENING_REASONS.MISSED_DEADLINE]: 'I missed the deadline for uploading the receipt',
  [ORDER_REOPENING_REASONS.TECHNICAL_ISSUE]: 'I experienced technical issues with the app',
  [ORDER_REOPENING_REASONS.PAYMENT_DELAY]: 'My payment was delayed',
  [ORDER_REOPENING_REASONS.FORGOT_UPLOAD]: 'I forgot to upload the receipt',
  [ORDER_REOPENING_REASONS.NETWORK_ISSUE]: 'I had network connectivity problems',
  [ORDER_REOPENING_REASONS.BUSY_SCHEDULE]: 'I was busy and couldn\'t upload in time',
  [ORDER_REOPENING_REASONS.EMERGENCY]: 'I had an emergency situation',
  [ORDER_REOPENING_REASONS.MISUNDERSTOOD_TIMER]: 'I misunderstood the timer requirement',
  [ORDER_REOPENING_REASONS.OTHER]: 'Other reason (please specify)'
};

export const ORDER_REOPENING_DECLINE_REASONS = {
  TOO_MANY_REQUESTS: 'too_many_requests',
  ORDER_TOO_OLD: 'order_too_old',
  POLICY_VIOLATION: 'policy_violation',
  INSUFFICIENT_REASON: 'insufficient_reason',
  REPEATED_OFFENSE: 'repeated_offense',
  INVENTORY_UNAVAILABLE: 'inventory_unavailable',
  OTHER: 'other'
};

export const ORDER_REOPENING_DECLINE_MESSAGES = {
  [ORDER_REOPENING_DECLINE_REASONS.TOO_MANY_REQUESTS]: 'You have exceeded the maximum number of reopening requests',
  [ORDER_REOPENING_DECLINE_REASONS.ORDER_TOO_OLD]: 'This order is too old to be reopened',
  [ORDER_REOPENING_DECLINE_REASONS.POLICY_VIOLATION]: 'Reopening request violates our policy',
  [ORDER_REOPENING_DECLINE_REASONS.INSUFFICIENT_REASON]: 'The reason provided is not sufficient',
  [ORDER_REOPENING_DECLINE_REASONS.REPEATED_OFFENSE]: 'This is a repeated offense',
  [ORDER_REOPENING_DECLINE_REASONS.INVENTORY_UNAVAILABLE]: 'Items are no longer available',
  [ORDER_REOPENING_DECLINE_REASONS.OTHER]: 'Other reason (please specify)'
};

export const getReopeningMessage = (reason) => {
  return ORDER_REOPENING_MESSAGES[reason] || ORDER_REOPENING_MESSAGES.OTHER;
};

export const getReopeningDeclineMessage = (reason) => {
  return ORDER_REOPENING_DECLINE_MESSAGES[reason] || ORDER_REOPENING_DECLINE_MESSAGES.OTHER;
};

// Maximum number of reopening requests allowed per order
export const MAX_REOPENING_REQUESTS = 3;

// Maximum time (in hours) after decline to allow reopening request
export const MAX_REOPENING_WINDOW_HOURS = 24;
