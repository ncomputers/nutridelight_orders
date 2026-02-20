# Order Processing Business Logic

## Overview

Order processing is the core business function of Nutridelight Orders, encompassing the entire lifecycle from customer order placement to final delivery and invoicing. This document details the business rules, calculations, and validation logic that govern order processing.

## Order Lifecycle

### Status Flow

```
pending → confirmed → purchase_done → out_for_delivery → delivered → invoiced
    ↓           ↓            ↓              ↓           ↓
  rejected   failed      cancelled     returned    cancelled
```

### Status Definitions

| Status | Description | Business Rules |
|--------|-------------|----------------|
| **pending** | Order received, awaiting confirmation | Default status for new orders |
| **confirmed** | Order verified and scheduled | Can only be set from pending |
| **purchase_done** | Items procured from suppliers | Requires confirmed status |
| **out_for_delivery** | Order on the way to customer | Requires purchase_done status |
| **delivered** | Order received by customer | Final delivery status |
| **invoiced** | Invoice generated and sent | Requires delivered status |
| **rejected** | Order cannot be fulfilled | Can be set from pending |
| **failed** | Order processing failed | Can be set from any status |
| **cancelled** | Order cancelled by customer | Can be set from pending/confirmed |

### Status Transition Rules

```typescript
const validTransitions = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['purchase_done', 'cancelled'],
  purchase_done: ['out_for_delivery', 'failed'],
  out_for_delivery: ['delivered', 'returned', 'failed'],
  delivered: ['invoiced'],
  invoiced: [], // Terminal state
  rejected: [], // Terminal state
  failed: ['pending'], // Can retry
  cancelled: [] // Terminal state
};
```

## Order Creation Logic

### Order Validation Rules

#### Restaurant Validation
```typescript
const validateRestaurant = async (slug: string) => {
  const restaurant = await getRestaurant(slug);
  
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }
  
  if (!restaurant.is_active) {
    throw new Error('Restaurant is not active');
  }
  
  return restaurant;
};
```

#### Item Validation
```typescript
const validateItems = async (items: OrderItem[]) => {
  const validations = await Promise.all(
    items.map(item => validateItemAvailability(item))
  );
  
  const unavailable = validations.filter(v => !v.is_available);
  
  if (unavailable.length > 0) {
    throw new Error(`Items unavailable: ${unavailable.map(i => i.item_code).join(', ')}`);
  }
  
  return validations;
};
```

#### Quantity Validation
```typescript
const validateQuantities = (items: OrderItem[]) => {
  items.forEach(item => {
    if (item.qty <= 0) {
      throw new Error(`Invalid quantity for ${item.item_code}: ${item.qty}`);
    }
    
    if (item.qty > MAX_ORDER_QUANTITY) {
      throw new Error(`Quantity exceeds maximum for ${item.item_code}: ${item.qty}`);
    }
  });
};
```

#### Order Deadline Validation
```typescript
const validateOrderDeadline = (orderDate: Date) => {
  const now = new Date();
  const deadline = new Date(orderDate);
  deadline.setHours(23, 0, 0, 0); // 11:00 PM
  
  if (now > deadline) {
    throw new Error('Order deadline passed (11:00 PM)');
  }
  
  return true;
};
```

### Order Reference Generation

```typescript
const generateOrderRef = (date: Date): string => {
  const dateStr = date.toISOString().slice(2, 10).replace('-', '');
  const random = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${dateStr}-${random}`;
};

// Example: ORD-250201-12345
```

### Order Creation Process

```typescript
const createOrder = async (orderData: CreateOrderRequest) => {
  // 1. Validate restaurant
  const restaurant = await validateRestaurant(orderData.restaurant_slug);
  
  // 2. Validate order deadline
  validateOrderDeadline(orderData.order_date);
  
  // 3. Validate items and quantities
  await validateItems(orderData.items);
  validateQuantities(orderData.items);
  
  // 4. Generate order reference
  const orderRef = generateOrderRef(orderData.order_date);
  
  // 5. Create order record
  const order = await insertOrder({
    order_ref: orderRef,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    restaurant_slug: restaurant.slug,
    contact_name: orderData.contact_name,
    contact_phone: orderData.contact_phone,
    order_date: orderData.order_date,
    delivery_date: orderData.delivery_date,
    items: orderData.items,
    notes: orderData.notes,
    status: 'pending'
  });
  
  return order;
};
```

## Order Confirmation Logic

### Availability Check

```typescript
const checkAvailability = async (order: Order) => {
  const availabilityChecks = await Promise.all(
    order.items.map(async item => {
      const availability = await getItemAvailability(item.code);
      return {
        ...item,
        available: availability.is_available,
        stock_qty: availability.stock_qty
      };
    })
  );
  
  const unavailable = availabilityChecks.filter(item => !item.available);
  
  return {
    canConfirm: unavailable.length === 0,
    unavailableItems: unavailable,
    totalValue: calculateOrderTotal(order.items)
  };
};
```

### Pricing Calculation

```typescript
const calculateItemPrice = (item: OrderItem, marketPrices: MarketPrice[]) => {
  const marketPrice = marketPrices.find(p => p.item_code === item.code);
  
  if (!marketPrice) {
    throw new Error(`Market price not found for ${item.code}`);
  }
  
  return {
    unit_price: marketPrice.price,
    line_total: item.qty * marketPrice.price
  };
};

const calculateOrderTotal = (items: OrderItem[]) => {
  return items.reduce((total, item) => {
    const price = getCurrentMarketPrice(item.code);
    return total + (item.qty * price);
  }, 0);
};
```

### Confirmation Process

```typescript
const confirmOrder = async (orderId: string, confirmedBy: string) => {
  const order = await getOrder(orderId);
  
  if (order.status !== 'pending') {
    throw new Error('Order cannot be confirmed');
  }
  
  // Check availability
  const availability = await checkAvailability(order);
  
  if (!availability.canConfirm) {
    // Update order with unavailable items
    await updateOrder(orderId, {
      status: 'rejected',
      notes: `Items unavailable: ${availability.unavailableItems.map(i => i.code).join(', ')}`
    });
    
    // Notify restaurant
    await sendUnavailabilityNotification(order, availability.unavailableItems);
    
    return { success: false, reason: 'Items unavailable' };
  }
  
  // Update order status
  await updateOrderStatus(orderId, 'confirmed', confirmedBy);
  
  // Add to purchase planning
  await addToPurchasePlanning(order);
  
  // Send confirmation
  await sendOrderConfirmation(order);
  
  return { success: true, order };
};
```

## Purchase Planning Logic

### Demand Aggregation

```typescript
const aggregateDemand = async (purchaseDate: Date) => {
  const confirmedOrders = await getOrders({
    status: 'confirmed',
    delivery_date: purchaseDate
  });
  
  const demandMap = new Map<string, DemandItem>();
  
  confirmedOrders.forEach(order => {
    order.items.forEach(item => {
      const existing = demandMap.get(item.code) || {
        item_code: item.code,
        item_en: item.en,
        item_hi: item.hi,
        category: item.category,
        total_qty: 0,
        source_orders: []
      };
      
      existing.total_qty += item.qty;
      existing.source_orders.push({
        order_id: order.id,
        restaurant: order.restaurant_name,
        qty: item.qty
      });
      
      demandMap.set(item.code, existing);
    });
  });
  
  return Array.from(demandMap.values());
};
```

### Stock Adjustment Calculation

```typescript
const calculateStockAdjustment = (
  demandQty: number, 
  currentStock: number, 
  safetyStock: number,
  historicalVariance: number
) => {
  const baseRequirement = Math.max(0, demandQty - currentStock);
  const varianceBuffer = baseRequirement * historicalVariance;
  const safetyBuffer = Math.max(0, safetyStock - currentStock);
  
  const adjustment = varianceBuffer + safetyBuffer;
  
  return {
    ordered_qty: demandQty,
    current_stock: currentStock,
    safety_stock: safetyStock,
    variance_buffer: varianceBuffer,
    adjustment_qty: adjustment,
    final_qty: baseRequirement + adjustment
  };
};
```

### Purchase Plan Creation

```typescript
const createPurchasePlan = async (purchaseDate: Date) => {
  // 1. Aggregate demand
  const demandItems = await aggregateDemand(purchaseDate);
  
  // 2. Get current stock
  const stockLevels = await getCurrentStockLevels();
  
  // 3. Calculate requirements
  const purchaseRequirements = demandItems.map(item => {
    const stock = stockLevels.find(s => s.item_code === item.code) || { stock_qty: 0 };
    const adjustment = calculateStockAdjustment(
      item.total_qty,
      stock.stock_qty,
      getSafetyStock(item.code),
      getHistoricalVariance(item.code)
    );
    
    return {
      ...item,
      ...adjustment
    };
  });
  
  // 4. Create purchase plan records
  const plans = await Promise.all(
    purchaseRequirements.map(req => 
      upsertPurchasePlan({
        purchase_date: purchaseDate,
        item_en: req.item_en,
        item_hi: req.item_hi,
        category: req.category,
        ordered_qty: req.ordered_qty,
        adjustment_qty: req.adjustment_qty,
        final_qty: req.final_qty,
        source_orders: req.source_orders
      })
    )
  );
  
  return plans;
};
```

## Order Fulfillment Logic

### Stock Allocation

```typescript
const allocateStock = async (orderId: string) => {
  const order = await getOrder(orderId);
  const allocations = [];
  
  for (const item of order.items) {
    const stock = await getItemStock(item.code);
    
    if (stock.available_qty >= item.qty) {
      // Allocate stock
      await updateItemStock(item.code, {
        allocated_qty: stock.allocated_qty + item.qty,
        available_qty: stock.available_qty - item.qty
      });
      
      allocations.push({
        item_code: item.code,
        allocated_qty: item.qty,
        status: 'allocated'
      });
    } else {
      allocations.push({
        item_code: item.code,
        allocated_qty: 0,
        status: 'insufficient_stock'
      });
    }
  }
  
  return allocations;
};
```

### Delivery Planning

```typescript
const planDelivery = async (orders: Order[]) => {
  // Group by geographic area
  const areaGroups = groupOrdersByArea(orders);
  
  const deliveryRoutes = areaGroups.map(area => {
    return {
      area: area.name,
      orders: area.orders,
      estimated_duration: calculateDeliveryDuration(area.orders),
      vehicle_requirements: calculateVehicleRequirements(area.orders)
    };
  });
  
  // Optimize routes
  return optimizeDeliveryRoutes(deliveryRoutes);
};
```

### Delivery Confirmation

```typescript
const confirmDelivery = async (orderId: string, deliveredBy: string) => {
  const order = await getOrder(orderId);
  
  if (order.status !== 'out_for_delivery') {
    throw new Error('Order is not out for delivery');
  }
  
  // Update order status
  await updateOrderStatus(orderId, 'delivered', deliveredBy);
  
  // Release allocated stock
  await releaseAllocatedStock(order.items);
  
  // Update stock levels (reduce inventory)
  await updateStockLevels(order.items);
  
  // Trigger invoice generation
  await triggerInvoiceGeneration(orderId);
  
  // Send delivery confirmation
  await sendDeliveryConfirmation(order);
  
  return order;
};
```

## Order Calculations

### Quantity Calculations

```typescript
// Rounding precision for quantities
const QUANTITY_PRECISION = 10;

const roundQuantity = (value: number): number => {
  return Math.round(value * QUANTITY_PRECISION) / QUANTITY_PRECISION;
};

const calculateTotalQuantity = (items: OrderItem[]): number => {
  return roundQuantity(
    items.reduce((total, item) => total + item.qty, 0)
  );
};
```

### Weight Calculations

```typescript
const calculateTotalWeight = (items: OrderItem[]): number => {
  return items.reduce((total, item) => {
    const weightPerUnit = getItemWeight(item.code);
    return total + (item.qty * weightPerUnit);
  }, 0);
};
```

### Value Calculations

```typescript
const calculateOrderValue = (items: OrderItem[], prices: MarketPrice[]): number => {
  return items.reduce((total, item) => {
    const price = prices.find(p => p.item_code === item.code);
    if (!price) {
      throw new Error(`Price not found for ${item.code}`);
    }
    return total + (item.qty * price.price);
  }, 0);
};
```

## Business Rules

### Order Rules

1. **Order Deadline**: Orders must be placed by 11:00 PM for next-day delivery
2. **Minimum Order**: Minimum order value of ₹500 applies
3. **Maximum Quantity**: Individual item quantities cannot exceed 100kg
4. **Delivery Radius**: Delivery limited to 25km radius
5. **Payment Terms**: Payment due within 7 days of delivery

### Item Rules

1. **Availability**: Only available items can be ordered
2. **Seasonality**: Seasonal items only available during specific periods
3. **Quality Grades**: Premium items have minimum order quantities
4. **Substitution**: Items may be substituted with equivalents if unavailable

### Pricing Rules

1. **Market-Based**: Prices based on daily mandi rates
2. **Dynamic Pricing**: Prices may change based on availability
3. **Volume Discounts**: Discounts available for orders above ₹5000
4. **Delivery Charges**: Free delivery above ₹2000, otherwise ₹50

### Cancellation Rules

1. **Pending Orders**: Can be cancelled until 10:00 PM
2. **Confirmed Orders**: Cancellation fee of 10% applies
3. **Delivered Orders**: Cannot be cancelled
4. **Refund Policy**: Refunds processed within 3-5 business days

## Error Handling

### Validation Errors

```typescript
class OrderValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

// Usage examples
throw new OrderValidationError('Restaurant not found', 'RESTAURANT_NOT_FOUND');
throw new OrderValidationError('Order deadline passed', 'DEADLINE_PASSED', { deadline: '23:00' });
```

### Business Logic Errors

```typescript
class BusinessLogicError extends Error {
  constructor(
    message: string,
    public rule: string,
    public context?: any
  ) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

// Usage examples
throw new BusinessLogicError('Cannot confirm rejected order', 'INVALID_STATUS_TRANSITION');
throw new BusinessLogicError('Insufficient stock for item', 'INSUFFICIENT_STOCK', { item_code: 'VEG_TOMATO' });
```

## Performance Considerations

### Database Optimization

1. **Indexing**: Proper indexes on status, dates, and restaurant fields
2. **Query Optimization**: Use efficient queries with proper joins
3. **Batch Processing**: Process multiple orders in batches
4. **Caching**: Cache frequently accessed data

### Business Logic Optimization

1. **Lazy Loading**: Load data only when needed
2. **Memoization**: Cache calculation results
3. **Async Processing**: Use async/await for I/O operations
4. **Error Boundaries**: Handle errors gracefully

## Testing Strategy

### Unit Tests

```typescript
describe('Order Processing Logic', () => {
  test('should generate valid order reference', () => {
    const date = new Date('2026-01-22');
    const ref = generateOrderRef(date);
    expect(ref).toMatch(/^ORD-\d{6}-\d{5}$/);
  });
  
  test('should validate order deadline', () => {
    const validDate = new Date();
    validDate.setHours(20, 0, 0, 0);
    expect(() => validateOrderDeadline(validDate)).not.toThrow();
    
    const invalidDate = new Date();
    invalidDate.setHours(23, 30, 0, 0);
    expect(() => validateOrderDeadline(invalidDate)).toThrow('Order deadline passed');
  });
});
```

### Integration Tests

```typescript
describe('Order Processing Integration', () => {
  test('should create and confirm order', async () => {
    const orderData = createMockOrderData();
    const order = await createOrder(orderData);
    expect(order.status).toBe('pending');
    
    const confirmed = await confirmOrder(order.id, 'test-user');
    expect(confirmed.success).toBe(true);
    expect(confirmed.order.status).toBe('confirmed');
  });
});
```

This comprehensive business logic documentation ensures that all order processing rules are clearly defined, testable, and maintainable.
