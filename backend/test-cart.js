import { pool } from "./libs/database.js";

// Cart Verification Script
// This script tests and verifies the cart functionality is working correctly

const verifyCartFunctionality = async (customerId) => {
  console.log(`\n=== Cart Verification for Customer ID: ${customerId} ===\n`);

  try {
    // 1. Check current cart items
    console.log("1. Checking current cart items...");
    const cartQuery = `
      SELECT o.id as order_id, o.in_cart, o.order_status, o.total_price as order_total,
             o.created_at, o.concession_id,
             od.id as order_detail_id, od.quantity, od.total_price as detail_total,
             m.item_name, m.price as base_price,
             c.concession_name
      FROM tblorder o
      JOIN tblorderdetail od ON o.id = od.order_id
      JOIN tblmenuitem m ON od.item_id = m.id
      JOIN tblconcession c ON o.concession_id = c.id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE
      ORDER BY o.created_at DESC, od.id ASC
    `;

    const cartResult = await pool.query(cartQuery, [customerId]);
    console.log(`   Found ${cartResult.rows.length} items in cart`);

    if (cartResult.rows.length > 0) {
      console.log("   Cart Items:");
      cartResult.rows.forEach((item, index) => {
        console.log(
          `   ${index + 1}. ${item.item_name} (Qty: ${item.quantity}) - ₱${item.detail_total} [Order: ${item.order_id}]`,
        );
        console.log(`      Concession: ${item.concession_name}`);
      });
    } else {
      console.log("   Cart is empty");
    }

    // 2. Check all orders (including non-cart) for this customer
    console.log("\n2. Checking all orders for this customer...");
    const allOrdersQuery = `
      SELECT o.id, o.order_status, o.in_cart, o.total_price, o.created_at,
             COUNT(od.id) as item_count
      FROM tblorder o
      LEFT JOIN tblorderdetail od ON o.id = od.order_id
      WHERE o.customer_id = $1
      GROUP BY o.id, o.order_status, o.in_cart, o.total_price, o.created_at
      ORDER BY o.created_at DESC
      LIMIT 10
    `;

    const allOrdersResult = await pool.query(allOrdersQuery, [customerId]);
    console.log(
      `   Found ${allOrdersResult.rows.length} total orders for this customer`,
    );

    allOrdersResult.rows.forEach((order, index) => {
      const cartStatus = order.in_cart ? "[CART]" : "[ORDER]";
      console.log(
        `   ${index + 1}. Order ${order.id} ${cartStatus} - Status: ${order.order_status} - ₱${order.total_price || 0} (${order.item_count} items)`,
      );
    });

    // 3. Verify database constraints and data integrity
    console.log("\n3. Verifying database integrity...");

    // Check for orphaned order details
    const orphanedDetailsQuery = `
      SELECT od.id as detail_id, od.order_id
      FROM tblorderdetail od
      LEFT JOIN tblorder o ON od.order_id = o.id
      WHERE o.id IS NULL
      LIMIT 5
    `;

    const orphanedResult = await pool.query(orphanedDetailsQuery);
    if (orphanedResult.rows.length > 0) {
      console.log(
        `   ⚠️  Warning: Found ${orphanedResult.rows.length} orphaned order details`,
      );
      orphanedResult.rows.forEach((row) => {
        console.log(
          `      Detail ID ${row.detail_id} references non-existent order ${row.order_id}`,
        );
      });
    } else {
      console.log("   ✅ No orphaned order details found");
    }

    // Check for empty cart orders
    const emptyCartOrdersQuery = `
      SELECT o.id as order_id
      FROM tblorder o
      LEFT JOIN tblorderdetail od ON o.id = od.order_id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE AND od.id IS NULL
    `;

    const emptyCartResult = await pool.query(emptyCartOrdersQuery, [
      customerId,
    ]);
    if (emptyCartResult.rows.length > 0) {
      console.log(
        `   ⚠️  Warning: Found ${emptyCartResult.rows.length} empty cart orders`,
      );
      emptyCartResult.rows.forEach((row) => {
        console.log(`      Empty cart order: ${row.order_id}`);
      });
    } else {
      console.log("   ✅ No empty cart orders found");
    }

    // 4. Test cart operations (if cart has items)
    if (cartResult.rows.length > 0) {
      console.log("\n4. Testing cart operations...");

      // Test total calculation
      const totalFromItems = cartResult.rows.reduce(
        (sum, item) => sum + parseFloat(item.detail_total),
        0,
      );
      const orderTotals = [
        ...new Set(cartResult.rows.map((item) => item.order_id)),
      ].map((orderId) => {
        const orderItems = cartResult.rows.filter(
          (item) => item.order_id === orderId,
        );
        const orderTotal = orderItems[0].order_total;
        const calculatedTotal = orderItems.reduce(
          (sum, item) => sum + parseFloat(item.detail_total),
          0,
        );
        return { orderId, storedTotal: orderTotal, calculatedTotal };
      });

      orderTotals.forEach((order) => {
        if (Math.abs(order.storedTotal - order.calculatedTotal) < 0.01) {
          console.log(
            `   ✅ Order ${order.orderId}: Total calculation correct (₱${order.storedTotal})`,
          );
        } else {
          console.log(
            `   ❌ Order ${order.orderId}: Total mismatch - Stored: ₱${order.storedTotal}, Calculated: ₱${order.calculatedTotal}`,
          );
        }
      });
    }

    // 5. Summary
    console.log("\n=== Cart Verification Summary ===");
    console.log(`Customer ID: ${customerId}`);
    console.log(`Cart Items: ${cartResult.rows.length}`);
    console.log(`Total Orders: ${allOrdersResult.rows.length}`);
    console.log(
      `Cart Status: ${cartResult.rows.length > 0 ? "Has Items" : "Empty"}`,
    );
    console.log(`Verification Complete: ${new Date().toISOString()}`);

    return {
      success: true,
      cartItemCount: cartResult.rows.length,
      totalOrderCount: allOrdersResult.rows.length,
      cartItems: cartResult.rows,
      allOrders: allOrdersResult.rows,
    };
  } catch (error) {
    console.error("\n❌ Cart verification failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Run verification if called directly
const customerId = process.argv[2];
if (customerId) {
  verifyCartFunctionality(customerId)
    .then((result) => {
      if (result.success) {
        console.log("\n🎉 Cart verification completed successfully!");
        process.exit(0);
      } else {
        console.log("\n💥 Cart verification failed");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
} else {
  console.log("Usage: node test-cart.js <customer_id>");
  console.log("Example: node test-cart.js 1");
}

export { verifyCartFunctionality };
