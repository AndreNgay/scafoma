# Cart Implementation Documentation

## Current Cart System Overview

The Scafoma application uses a **database-based cart system** where cart items are persisted in the database with `in_cart = TRUE` flag. This ensures cart persistence across sessions and devices.

## Database Schema

### Key Tables
- `tblorder` - Main order table with `in_cart` boolean flag
- `tblorderdetail` - Individual items in orders
- `tblorderitemvariation` - Item variations/customizations

### Cart Identification
Cart items are identified by:
- `customer_id` - The customer who owns the cart
- `in_cart = TRUE` - Flag indicating item is in cart (not yet ordered)
- `order_status = 'cart'` - Status for cart items

## Backend Implementation

### Cart Operations

#### 1. Add to Cart (`addOrder` with `in_cart: true`)
```javascript
// POST /api/order
{
  customer_id: 123,
  concession_id: 456,
  order_status: "cart",
  in_cart: true,
  payment_method: "gcash"
}
```

**Logic:**
- Creates new order with `in_cart = TRUE`
- If cart order already exists for same customer+concession, returns existing order
- Supports multiple concessions in same cart (separate orders per concession)

#### 2. Fetch Cart (`getCartByCustomerId`)
```javascript
// GET /api/order/cart/:customer_id
```

**Features:**
- Automatically cleans up invalid items (unavailable items, closed concessions)
- Returns grouped cart items by concession
- Includes item details, variations, pricing

#### 3. Update Cart Item (`updateOrderDetailQuantity`)
```javascript
// PUT /api/order-detail/:orderDetailId/quantity
{
  quantity: 2
}
```

**Features:**
- Updates quantity and recalculates totals
- Handles variation pricing correctly
- Updates parent order total

#### 4. Remove Cart Item (`deleteOrderDetail`)
```javascript
// DELETE /api/order-detail/:orderDetailId
```

**Features:**
- Removes individual items
- Cleans up empty orders automatically

#### 5. Checkout Cart (`checkoutCart` or `checkoutSingleOrder`)
```javascript
// PUT /api/order/checkout/:customer_id
// PUT /api/order/checkout-single
```

**Logic:**
- Updates `in_cart = FALSE`
- Changes `order_status = 'pending'`
- Supports scheduling with `schedule_time`
- Sends notifications to concessionaires

## Frontend Implementation (React Native)

### Cart Screen (`Cart.tsx`)

#### Key Features:
- **Database Sync**: Fetches cart from database on screen focus
- **Real-time Updates**: Updates quantities and removes items
- **Grouping**: Groups items by concession for better UX
- **Scheduling**: Optional pickup time scheduling per concession
- **Individual Checkout**: Checkout per concession separately

#### Cart State Management:
```typescript
const [cartItems, setCartItems] = useState<CartItem[]>([]);
const [groupedCarts, setGroupedCarts] = useState<GroupedCart[]>([]);
```

#### Cart Operations:
- `fetchCart()` - Loads cart from database
- `updateQuantity()` - Updates item quantity
- `removeItem()` - Removes single item
- `checkoutSingleOrder()` - Checkout specific concession

### Adding to Cart (`MenuItemDetails.tsx`)

```typescript
const submitOrder = async (inCart: boolean) => {
  // Creates order with in_cart: inCart
  const orderRes = await api.post("/order", {
    customer_id: user.id,
    concession_id: item.concession_id,
    order_status: inCart ? "cart" : "pending",
    in_cart: inCart,
    payment_method: paymentMethod,
  });
  // ... add order details and variations
};
```

## Data Flow

### Adding Item to Cart:
1. User selects item and variations
2. Frontend calls `submitOrder(true)`
3. Backend creates order with `in_cart = TRUE`
4. Backend adds order details and variations
5. User sees success message

### Viewing Cart:
1. User navigates to cart screen
2. Frontend calls `getCartByCustomerId`
3. Backend cleans up invalid items
4. Backend returns grouped cart data
5. Frontend displays items grouped by concession

### Checkout Process:
1. User clicks checkout for a concession
2. Frontend calls `checkoutSingleOrder`
3. Backend updates `in_cart = FALSE` and `order_status = 'pending'`
4. Backend sends notification to concessionaire
5. User navigates to order tracking

## Error Handling

### Invalid Items Cleanup:
- Automatically removes items from unavailable menu items
- Removes items from closed concessions
- Cleans up empty orders

### Validation:
- Prevents duplicate cart orders for same customer+concession
- Validates item availability before adding
- Handles quantity constraints

## Testing

### Manual Testing:
1. Add items to cart from different concessions
2. Verify cart persistence across app restarts
3. Test quantity updates and item removal
4. Test checkout flow with scheduling
5. Verify cart cleanup for unavailable items

### Test Script:
```bash
node test-cart.js <customer_id>
```

## Troubleshooting

### Common Issues:

1. **Cart appears empty**:
   - Check if items are marked `in_cart = TRUE`
   - Verify items haven't been auto-cleaned due to unavailability
   - Check database connectivity

2. **Items not persisting**:
   - Verify `addOrder` is called with `in_cart: true`
   - Check for database errors in logs
   - Ensure proper customer_id is being passed

3. **Checkout not working**:
   - Verify `checkoutSingleOrder` endpoint is working
   - Check for required fields (payment_method, etc.)
   - Ensure proper order status transitions

### Debug Commands:
```sql
-- Check cart items for customer
SELECT * FROM tblorder WHERE customer_id = ? AND in_cart = TRUE;

-- Check all order details in cart
SELECT o.*, od.* FROM tblorder o 
JOIN tblorderdetail od ON o.id = od.order_id 
WHERE o.customer_id = ? AND o.in_cart = TRUE;
```

## Current Status

✅ **Working Features:**
- Database-based cart persistence
- Multi-concession cart support  
- Item quantity management
- Cart cleanup for invalid items
- Individual concession checkout
- Order scheduling support

✅ **Database Integration:**
- Proper `in_cart` flag usage
- Automatic total calculations
- Variation pricing support
- Order status management

The cart system is **fully functional** and follows the database-based approach as requested. Items are properly marked as `in_cart = TRUE` when added to cart and `in_cart = FALSE` when checked out.

## Migration Notes

If reverting from any "offline" cart implementation:
1. Ensure all cart operations use database endpoints
2. Remove any localStorage/AsyncStorage cart logic
3. Verify `in_cart` flags are properly set
4. Test cart persistence across app sessions

The current implementation already follows the database-based cart pattern you requested.