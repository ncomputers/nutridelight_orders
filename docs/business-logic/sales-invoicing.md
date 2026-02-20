# Sales and Invoicing Business Logic

## Overview

The sales and invoicing system handles the financial aspects of the Nutridelight Orders platform, including invoice generation, payment processing, and revenue recognition. This document details the business rules, calculations, and workflows that govern sales operations.

## Invoice Lifecycle

### Invoice Status Flow

```
draft → finalized → paid
   ↓        ↓       ↓
cancelled  partial  overdue
```

### Status Definitions

| Status | Description | Business Rules |
|--------|-------------|----------------|
| **draft** | Invoice being prepared | Default status for new invoices |
| **finalized** | Invoice sent to customer | Can only be set from draft |
| **partial** | Partial payment received | Requires finalized status |
| **paid** | Full payment collected | Final payment status |
| **overdue** | Payment past due date | Auto-calculated from finalized |
| **cancelled** | Invoice voided | Can be set from draft only |

### Invoice Generation Rules

#### Eligibility Criteria
```typescript
const validateInvoiceEligibility = async (orderId: string) => {
  const order = await getOrder(orderId);
  
  // Order must be delivered
  if (order.status !== 'delivered') {
    throw new BusinessLogicError(
      'Order must be delivered before invoicing',
      'ORDER_NOT_DELIVERED',
      { order_status: order.status }
    );
  }
  
  // Order must not be already invoiced
  const existingInvoice = await getInvoiceByOrderId(orderId);
  if (existingInvoice) {
    throw new BusinessLogicError(
      'Order already invoiced',
      'ORDER_ALREADY_INVOICED',
      { invoice_id: existingInvoice.id }
    );
  }
  
  return order;
};
```

#### Invoice Number Generation
```typescript
const generateInvoiceNumber = (date: Date): string => {
  const dateStr = date.toISOString().slice(0, 10).replace('-', '');
  const sequence = getNextInvoiceSequence(date);
  return `SI-${dateStr}-${sequence.toString().padStart(5, '0')}`;
};

// Example: SI-20260122-00001
```

#### Invoice Creation Process
```typescript
const createInvoice = async (invoiceData: CreateInvoiceRequest) => {
  // 1. Validate order eligibility
  const order = await validateInvoiceEligibility(invoiceData.order_id);
  
  // 2. Generate invoice number
  const invoiceNo = generateInvoiceNumber(invoiceData.invoice_date);
  
  // 3. Calculate invoice totals
  const lineItems = await createInvoiceLines(order.items);
  const totals = calculateInvoiceTotals(lineItems, invoiceData);
  
  // 4. Create invoice record
  const invoice = await insertInvoice({
    invoice_no: invoiceNo,
    order_id: order.id,
    restaurant_id: order.restaurant_id,
    restaurant_name: order.restaurant_name,
    restaurant_slug: order.restaurant_slug,
    invoice_date: invoiceData.invoice_date,
    delivery_date: order.delivery_date,
    status: 'draft',
    ...totals
  });
  
  // 5. Create invoice lines
  await createInvoiceLineItems(invoice.id, lineItems);
  
  return invoice;
};
```

## Pricing Calculations

### Unit Price Determination

```typescript
const determineUnitPrice = (
  itemCode: string, 
  deliveryDate: Date,
  restaurantTier: string
): number => {
  // 1. Get base market price
  const marketPrice = getMarketPrice(itemCode, deliveryDate);
  
  // 2. Apply restaurant tier multiplier
  const tierMultiplier = getTierMultiplier(restaurantTier);
  
  // 3. Apply quality grade premium
  const qualityPremium = getQualityPremium(itemCode);
  
  // 4. Apply seasonal adjustment
  const seasonalAdjustment = getSeasonalAdjustment(itemCode, deliveryDate);
  
  const basePrice = marketPrice * tierMultiplier;
  const finalPrice = basePrice + qualityPremium + seasonalAdjustment;
  
  return roundToDecimal(finalPrice, 2);
};
```

### Line Item Calculations

```typescript
const calculateLineItem = (
  item: OrderItem,
  unitPrice: number,
  quantity: number
): InvoiceLine => {
  const lineTotal = quantity * unitPrice;
  
  return {
    item_code: item.code,
    item_en: item.en,
    item_hi: item.hi,
    qty: quantity,
    unit: 'kg',
    unit_price: unitPrice,
    line_total: lineTotal,
    line_note: null
  };
};
```

### Discount Calculations

```typescript
const calculateDiscounts = (
  subtotal: number,
  discountRules: DiscountRule[],
  customer: Restaurant
): DiscountCalculation => {
  let totalDiscount = 0;
  const appliedDiscounts = [];
  
  for (const rule of discountRules) {
    if (isDiscountApplicable(rule, subtotal, customer)) {
      const discountAmount = calculateDiscountAmount(rule, subtotal);
      totalDiscount += discountAmount;
      
      appliedDiscounts.push({
        rule_id: rule.id,
        rule_name: rule.name,
        discount_amount: discountAmount,
        discount_percentage: rule.percentage
      });
    }
  }
  
  return {
    total_discount: totalDiscount,
    applied_discounts: appliedDiscounts,
    effective_discount_rate: totalDiscount / subtotal
  };
};
```

### Tax Calculations

```typescript
const calculateTaxes = (
  taxableAmount: number,
  taxRules: TaxRule[]
): TaxCalculation => {
  const taxes = taxRules.map(rule => ({
    tax_type: rule.type,
    tax_rate: rule.rate,
    tax_amount: taxableAmount * rule.rate,
    tax_description: rule.description
  }));
  
  const totalTax = taxes.reduce((sum, tax) => sum + tax.tax_amount, 0);
  
  return {
    taxes,
    total_tax: totalTax,
    effective_tax_rate: totalTax / taxableAmount
  };
};
```

### Total Calculations

```typescript
const calculateInvoiceTotals = (
  lineItems: InvoiceLine[],
  invoiceData: CreateInvoiceRequest
): InvoiceTotals => {
  // 1. Calculate subtotal
  const subtotal = lineItems.reduce((sum, line) => sum + line.line_total, 0);
  
  // 2. Apply discounts
  const discountCalculation = calculateDiscounts(
    subtotal,
    invoiceData.discount_rules || [],
    invoiceData.restaurant
  );
  
  // 3. Calculate other charges
  const otherCharges = calculateOtherCharges(
    invoiceData.other_charges || [],
    subtotal
  );
  
  // 4. Calculate taxes (if applicable)
  const taxableAmount = Math.max(0, subtotal - discountCalculation.total_discount);
  const taxCalculation = calculateTaxes(taxableAmount, invoiceData.tax_rules || []);
  
  // 5. Calculate grand total
  const grandTotal = subtotal 
    - discountCalculation.total_discount 
    + otherCharges.total 
    + taxCalculation.total_tax;
  
  return {
    subtotal: roundToDecimal(subtotal, 2),
    discount_amount: roundToDecimal(discountCalculation.total_discount, 2),
    other_charges: roundToDecimal(otherCharges.total, 2),
    tax_amount: roundToDecimal(taxCalculation.total_tax, 2),
    grand_total: roundToDecimal(grandTotal, 2),
    paid_amount: 0,
    due_amount: roundToDecimal(grandTotal, 2)
  };
};
```

## Payment Processing

### Payment Methods

```typescript
enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHEQUE = 'cheque',
  UPI = 'upi',
  DIGITAL_WALLET = 'digital_wallet',
  CREDIT_CARD = 'credit_card'
}

interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  bank_name?: string;
  cheque_number?: string;
  upi_id?: string;
  wallet_provider?: string;
  card_last_four?: string;
}
```

### Payment Validation

```typescript
const validatePayment = (
  payment: PaymentDetails,
  invoice: Invoice
): ValidationResult => {
  // 1. Validate amount
  if (payment.amount <= 0) {
    return { valid: false, error: 'Payment amount must be positive' };
  }
  
  if (payment.amount > invoice.due_amount) {
    return { valid: false, error: 'Payment amount exceeds due amount' };
  }
  
  // 2. Validate payment method specific requirements
  switch (payment.method) {
    case PaymentMethod.BANK_TRANSFER:
      if (!payment.reference) {
        return { valid: false, error: 'Bank transfer requires reference number' };
      }
      break;
      
    case PaymentMethod.CHEQUE:
      if (!payment.cheque_number) {
        return { valid: false, error: 'Cheque payment requires cheque number' };
      }
      break;
      
    case PaymentMethod.UPI:
      if (!payment.upi_id) {
        return { valid: false, error: 'UPI payment requires UPI ID' };
      }
      break;
  }
  
  return { valid: true };
};
```

### Payment Application

```typescript
const applyPayment = async (
  invoiceId: string,
  payment: PaymentDetails,
  processedBy: string
): PaymentResult => {
  const invoice = await getInvoice(invoiceId);
  
  // 1. Validate payment
  const validation = validatePayment(payment, invoice);
  if (!validation.valid) {
    throw new BusinessLogicError(
      validation.error,
      'INVALID_PAYMENT',
      { payment, invoice_id: invoiceId }
    );
  }
  
  // 2. Calculate new payment status
  const newPaidAmount = invoice.paid_amount + payment.amount;
  const newDueAmount = invoice.grand_total - newPaidAmount;
  
  let newPaymentStatus: PaymentStatus;
  if (newDueAmount <= 0) {
    newPaymentStatus = 'paid';
  } else if (payment.amount > 0) {
    newPaymentStatus = 'partial';
  } else {
    newPaymentStatus = invoice.payment_status;
  }
  
  // 3. Update invoice
  const updatedInvoice = await updateInvoice(invoiceId, {
    paid_amount: newPaidAmount,
    due_amount: newDueAmount,
    payment_status: newPaymentStatus
  });
  
  // 4. Record payment transaction
  await recordPaymentTransaction({
    invoice_id: invoiceId,
    payment_method: payment.method,
    amount: payment.amount,
    reference: payment.reference,
    processed_by: processedBy,
    processed_at: new Date()
  });
  
  // 5. Create accounting entries
  await createPaymentAccountingEntries(invoiceId, payment);
  
  // 6. Send payment receipt
  if (payment.amount > 0) {
    await sendPaymentReceipt(updatedInvoice, payment);
  }
  
  return {
    invoice: updatedInvoice,
    payment_applied: payment.amount,
    remaining_balance: newDueAmount,
    payment_status: newPaymentStatus
  };
};
```

### Payment Status Management

```typescript
const updatePaymentStatus = async (invoiceId: string): Promise<void> => {
  const invoice = await getInvoice(invoiceId);
  
  // Check for overdue status
  if (invoice.payment_status !== 'paid' && invoice.payment_status !== 'cancelled') {
    const dueDate = new Date(invoice.invoice_date);
    dueDate.setDate(dueDate.getDate() + 7); // 7-day payment terms
    
    if (new Date() > dueDate) {
      await updateInvoice(invoiceId, {
        payment_status: 'overdue'
      });
      
      // Send overdue notification
      await sendOverdueNotification(invoice);
    }
  }
};
```

## Business Rules

### Discount Rules

#### Volume Discounts
```typescript
const volumeDiscountRules: DiscountRule[] = [
  {
    id: 'vol_5k',
    name: '5% off orders above ₹5,000',
    type: 'percentage',
    percentage: 0.05,
    minimum_amount: 5000,
    customer_tiers: ['regular', 'premium']
  },
  {
    id: 'vol_10k',
    name: '10% off orders above ₹10,000',
    type: 'percentage',
    percentage: 0.10,
    minimum_amount: 10000,
    customer_tiers: ['premium', 'vip']
  }
];
```

#### Early Payment Discounts
```typescript
const earlyPaymentDiscount = (invoice: Invoice): number => {
  const paymentDate = new Date();
  const dueDate = new Date(invoice.invoice_date);
  dueDate.setDate(dueDate.getDate() + 3); // 3-day early payment window
  
  if (paymentDate <= dueDate && invoice.payment_status === 'unpaid') {
    return invoice.grand_total * 0.02; // 2% early payment discount
  }
  
  return 0;
};
```

### Pricing Rules

#### Tier-Based Pricing
```typescript
const customerTiers = {
  'regular': { multiplier: 1.0, name: 'Regular Customer' },
  'premium': { multiplier: 0.95, name: 'Premium Customer' }, // 5% discount
  'vip': { multiplier: 0.90, name: 'VIP Customer' } // 10% discount
};
```

#### Dynamic Pricing
```typescript
const applyDynamicPricing = (
  itemCode: string,
  basePrice: number,
  demand: number,
  supply: number
): number => {
  const demandSupplyRatio = demand / supply;
  
  if (demandSupplyRatio > 1.2) {
    // High demand, low supply - increase price
    return basePrice * 1.1; // 10% increase
  } else if (demandSupplyRatio < 0.8) {
    // Low demand, high supply - decrease price
    return basePrice * 0.95; // 5% decrease
  }
  
  return basePrice; // No adjustment
};
```

### Payment Rules

#### Payment Terms
```typescript
const paymentTerms = {
  'regular': { days: 7, late_fee_rate: 0.015 }, // 1.5% per month
  'premium': { days: 14, late_fee_rate: 0.01 }, // 1% per month
  'vip': { days: 21, late_fee_rate: 0.008 } // 0.8% per month
};
```

#### Late Fee Calculation
```typescript
const calculateLateFee = (invoice: Invoice): number => {
  if (invoice.payment_status === 'paid' || invoice.payment_status === 'cancelled') {
    return 0;
  }
  
  const dueDate = new Date(invoice.invoice_date);
  dueDate.setDate(dueDate.getDate() + paymentTerms[invoice.restaurant_tier].days);
  
  const daysOverdue = Math.max(0, Math.floor(
    (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  if (daysOverdue > 0) {
    const monthlyRate = paymentTerms[invoice.restaurant_tier].late_fee_rate;
    const dailyRate = monthlyRate / 30;
    return invoice.due_amount * dailyRate * daysOverdue;
  }
  
  return 0;
};
```

## Revenue Recognition

### Revenue Recognition Rules

```typescript
const recognizeRevenue = async (invoiceId: string): Promise<void> => {
  const invoice = await getInvoice(invoiceId);
  
  // Revenue is recognized when:
  // 1. Order is delivered
  // 2. Invoice is finalized
  // 3. Revenue is probable to be collected
  
  if (invoice.status !== 'finalized') {
    throw new BusinessLogicError(
      'Invoice must be finalized for revenue recognition',
      'INVOICE_NOT_FINALIZED'
    );
  }
  
  const order = await getOrder(invoice.order_id);
  if (order.status !== 'delivered') {
    throw new BusinessLogicError(
      'Order must be delivered for revenue recognition',
      'ORDER_NOT_DELIVERED'
    );
  }
  
  // Create revenue recognition entry
  await createRevenueEntry({
    invoice_id: invoiceId,
    order_id: invoice.order_id,
    revenue_amount: invoice.grand_total,
    recognition_date: invoice.invoice_date,
    status: 'recognized'
  });
  
  // Update financial metrics
  await updateFinancialMetrics({
    total_revenue: invoice.grand_total,
    recognized_date: invoice.invoice_date
  });
};
```

### Bad Debt Provision

```typescript
const calculateBadDebtProvision = async (): Promise<void> => {
  const overdueInvoices = await getOverdueInvoices();
  
  for (const invoice of overdueInvoices) {
    const daysOverdue = calculateDaysOverdue(invoice);
    let provisionRate = 0;
    
    if (daysOverdue > 90) {
      provisionRate = 1.0; // 100% provision
    } else if (daysOverdue > 60) {
      provisionRate = 0.5; // 50% provision
    } else if (daysOverdue > 30) {
      provisionRate = 0.1; // 10% provision
    }
    
    if (provisionRate > 0) {
      const provisionAmount = invoice.due_amount * provisionRate;
      await createBadDebtProvision({
        invoice_id: invoice.id,
        provision_amount: provisionAmount,
        provision_rate: provisionRate,
        days_overdue: daysOverdue
      });
    }
  }
};
```

## Reporting and Analytics

### Sales Metrics

```typescript
const calculateSalesMetrics = async (
  dateFrom: Date,
  dateTo: Date
): Promise<SalesMetrics> => {
  const invoices = await getInvoicesByDateRange(dateFrom, dateTo);
  
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.due_amount, 0);
  
  const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
  const overdueInvoices = invoices.filter(inv => inv.payment_status === 'overdue');
  
  return {
    total_invoices: invoices.length,
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    total_due: totalDue,
    payment_rate: paidInvoices.length / invoices.length,
    overdue_rate: overdueInvoices.length / invoices.length,
    average_invoice_value: totalRevenue / invoices.length,
    collection_efficiency: totalPaid / totalRevenue
  };
};
```

### Customer Analysis

```typescript
const analyzeCustomerSpending = async (
  restaurantId: string,
  period: 'monthly' | 'quarterly' | 'yearly'
): Promise<CustomerAnalysis> => {
  const invoices = await getCustomerInvoices(restaurantId, period);
  
  const spending = invoices.reduce((acc, invoice) => {
    const period = getPeriodKey(invoice.invoice_date, period);
    if (!acc[period]) {
      acc[period] = { revenue: 0, orders: 0, avg_order_value: 0 };
    }
    acc[period].revenue += invoice.grand_total;
    acc[period].orders += 1;
    acc[period].avg_order_value = acc[period].revenue / acc[period].orders;
    return acc;
  }, {});
  
  return {
    restaurant_id: restaurantId,
    period_analysis: spending,
    total_revenue: Object.values(spending).reduce((sum, s) => sum + s.revenue, 0),
    total_orders: Object.values(spending).reduce((sum, s) => sum + s.orders, 0),
    customer_tier: determineCustomerTier(spending)
  };
};
```

## Error Handling

### Invoice Errors

```typescript
class InvoiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public invoiceId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'InvoiceError';
  }
}

// Usage examples
throw new InvoiceError('Invoice already paid', 'INVOICE_ALREADY_PAID', invoiceId);
throw new InvoiceError('Invalid payment amount', 'INVALID_PAYMENT_AMOUNT', invoiceId, { amount });
```

### Payment Errors

```typescript
class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public paymentMethod?: PaymentMethod,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// Usage examples
throw new PaymentError('Payment method not supported', 'UNSUPPORTED_PAYMENT_METHOD', paymentMethod);
throw new PaymentError('Insufficient funds', 'INSUFFICIENT_FUNDS', paymentMethod);
```

## Performance Considerations

### Database Optimization

1. **Indexing**: Proper indexes on invoice dates, status, and customer fields
2. **Query Optimization**: Efficient queries for reporting and analytics
3. **Batch Processing**: Process multiple payments in batches
4. **Caching**: Cache frequently accessed pricing data

### Calculation Optimization

1. **Memoization**: Cache expensive calculations
2. **Lazy Loading**: Load data only when needed
3. **Async Processing**: Use background jobs for heavy calculations
4. **Pre-computation**: Pre-compute common metrics

## Testing Strategy

### Unit Tests

```typescript
describe('Invoice Calculations', () => {
  test('should calculate line total correctly', () => {
    const lineItem = calculateLineItem(
      { code: 'VEG_TOMATO', en: 'Tomato', qty: 5.5 },
      25.50,
      5.5
    );
    
    expect(lineItem.line_total).toBe(140.25);
    expect(lineItem.unit_price).toBe(25.50);
  });
  
  test('should apply volume discount correctly', () => {
    const discount = calculateDiscounts(6000, volumeDiscountRules, { tier: 'regular' });
    expect(discount.total_discount).toBe(300); // 5% of 6000
  });
});
```

### Integration Tests

```typescript
describe('Invoice Processing Integration', () => {
  test('should create invoice and apply payment', async () => {
    const invoice = await createInvoice(mockInvoiceData);
    expect(invoice.status).toBe('draft');
    
    const payment = await applyPayment(invoice.id, {
      method: PaymentMethod.CASH,
      amount: invoice.grand_total,
      processed_by: 'test-user'
    });
    
    expect(payment.payment_status).toBe('paid');
    expect(payment.remaining_balance).toBe(0);
  });
});
```

This comprehensive sales and invoicing business logic documentation ensures accurate financial processing, proper revenue recognition, and maintainable code structure.
