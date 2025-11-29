# GCash Receipt Timer & Order Date Timezone Fixes

## Summary
Fixed the GCash receipt timer implementation and ensured order dates display correctly in Manila timezone across both customer and concessionaire views.

## Changes Made

### 1. Backend - Order Controller (`orderController.js`)

#### A. Enhanced `updatePaymentProof` function (lines 570-658)
- **Added**: Receipt timer expiration validation before allowing screenshot upload
- **Logic**: 
  - Checks if order is GCash payment method and status is 'accepted'
  - Calculates deadline from `payment_receipt_expires_at` or `accepted_at + receipt_timer`
  - Returns error with `timerExpired: true` flag if deadline has passed
  - Error message: "Receipt upload time has expired. This order will be automatically declined."

#### B. Enhanced `updateOrderStatus` function (lines 425-481)
- **Added**: Validation to prevent marking orders as 'ready for pickup' or 'completed' when GCash receipt timer has expired
- **Logic**:
  - Checks if attempting to change status to 'ready for pickup', 'ready-for-pickup', or 'completed'
  - For GCash orders in 'accepted' status without receipt, calculates deadline
  - Returns error with `timerExpired: true` flag if timer expired
  - Error message: "Cannot mark order as ready/completed: GCash receipt upload time has expired. Please decline this order."
- **Prevents**: Concessionaire from progressing order when customer hasn't uploaded receipt in time

### 2. Mobile App - Customer View (`ViewOrderCustomer.tsx`)

#### A. Enhanced `uploadPaymentProof` function (lines 294-327)
- **Added**: Client-side timer expiration check before upload attempt
- **Logic**: Calls `calculateTimer()` to check if timer is expired
- **Behavior**: Shows error toast and prevents upload if expired
- **Message**: "Receipt upload time has expired. This order will be automatically declined."

#### B. Added missing style `paymentExpiryText` (lines 1488-1493)
- Displays expiry timestamp in Manila timezone format

### 3. Mobile App - Concessionaire View (`ViewOrderConcessionaire.tsx`)

#### A. Enhanced `renderStatusButtons` function (lines 454-531)
- **Added**: New case for 'accepted' status with timer expiration logic
- **Behavior when timer expired**:
  - Displays alert message: "GCash receipt upload time has expired. This order must be declined."
  - Shows red alert icon
  - Provides "Decline Order" button instead of "Ready for Pick-up" button
  - Prevents progression to ready/completed states

#### B. Added new styles (lines 1799-1817)
- `expiredTimerContainer`: Red-bordered container for expired timer message
- `expiredTimerMessage`: Flexbox row for icon + message
- `expiredTimerText`: Red text styling for expiration message

## Order Date Timezone Handling

### Current Implementation (Already in place)
Both customer and concessionaire views use `formatManila()` function to:
1. Parse timestamps from backend (handles both UTC with 'Z' suffix and plain timestamps)
2. Treat plain timestamps as UTC
3. Format using `Intl.DateTimeFormat` with 'Asia/Manila' timezone
4. Display in format: "Nov 29, 07:21 AM" (example)

### Database Storage
- `created_at` stored as `timestamp without time zone` in PostgreSQL
- Backend returns plain timestamps (e.g., "2025-11-29 07:21:35.822299")
- Frontend treats these as UTC and converts to Manila timezone for display

## Timer Expiration Flow

### When Order is Accepted
1. Backend sets `accepted_at = NOW()` and `payment_receipt_expires_at = NOW() + receipt_timer`
2. Frontend displays countdown timer in customer view
3. Frontend displays countdown timer in concessionaire view

### When Timer Expires
1. **Customer side**:
   - Timer shows "Expired" in red
   - Upload button becomes disabled with "Upload Time Expired" text
   - Auto-decline check runs every second
   - If expired and no receipt uploaded, calls `/order/{id}/check-expired` to auto-decline

2. **Concessionaire side**:
   - Timer shows "Receipt Upload Expired" in red
   - "Ready for Pick-up" button is replaced with error message and "Decline Order" button
   - Cannot progress order until it's declined

3. **Backend validation**:
   - Upload endpoint rejects receipt uploads after deadline
   - Status update endpoint prevents marking as ready/completed after deadline

## Error Handling

### Upload Rejection
- Status: 400 Bad Request
- Response includes `timerExpired: true` flag
- Message: "Receipt upload time has expired. This order will be automatically declined."

### Status Update Rejection
- Status: 400 Bad Request
- Response includes `timerExpired: true` flag
- Message: "Cannot mark order as ready/completed: GCash receipt upload time has expired. Please decline this order."

## User Messages

### Customer Messages
- **Timer Active**: "⚠️ Please upload your GCash payment receipt before time expires"
- **Timer Expired**: "⏰ Time expired! Your order will be automatically declined if receipt is not uploaded."
- **Upload Attempt After Expiry**: "Receipt upload time has expired. This order will be automatically declined."

### Concessionaire Messages
- **Timer Active**: "⏳ Customer must upload GCash receipt before timer expires"
- **Timer Expired**: "⏰ Upload time has expired. Consider declining this order."
- **Status Update Attempt After Expiry**: "GCash receipt upload time has expired. This order must be declined."

## Testing Recommendations

1. **Timer Expiration**:
   - Create GCash order with short receipt_timer (e.g., 00:01:00)
   - Accept order and verify timer counts down
   - Wait for expiration and verify:
     - Customer cannot upload receipt
     - Concessionaire cannot mark as ready/completed
     - Auto-decline triggers after expiration

2. **Timezone Display**:
   - Verify order dates display in Manila timezone
   - Test with orders created at different times
   - Verify consistency between customer and concessionaire views

3. **Error Handling**:
   - Attempt upload after timer expires
   - Attempt status update after timer expires
   - Verify error messages display correctly
