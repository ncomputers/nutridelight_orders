# RPC Functions Documentation

## Overview

Nutridelight Orders uses PostgreSQL RPC (Remote Procedure Call) functions to encapsulate complex business logic and provide efficient database operations. These functions are called through the Supabase client and provide type-safe operations.

## Order Management Functions

### get_orders_with_restaurants

Retrieves orders with restaurant information in a single query.

```sql
CREATE OR REPLACE FUNCTION get_orders_with_restaurants(
  p_restaurant_slug TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_ref TEXT,
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  order_date DATE,
  delivery_date DATE,
  items JSONB,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_restaurant_slug`: Filter by restaurant (optional)
- `p_status`: Filter by order status (optional)
- `p_date_from`: Start date filter (optional)
- `p_date_to`: End date filter (optional)
- `p_limit`: Maximum records to return (default: 50)
- `p_offset`: Records to skip for pagination (default: 0)

**Returns:** Table of orders with restaurant details

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('get_orders_with_restaurants', {
  p_status: 'pending',
  p_date_from: new Date().toISOString().split('T')[0],
  p_limit: 100
});
```

### create_order_from_items

Creates a new order from item quantities with validation.

```sql
CREATE OR REPLACE FUNCTION create_order_from_items(
  p_restaurant_slug TEXT,
  p_contact_name TEXT,
  p_contact_phone TEXT,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_order_date DATE DEFAULT CURRENT_DATE,
  p_delivery_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_restaurant_slug`: Restaurant identifier
- `p_contact_name`: Contact person name
- `p_contact_phone`: Contact phone number
- `p_items`: JSON array of order items
- `p_notes`: Order notes (optional)
- `p_order_date`: Order date (default: today)
- `p_delivery_date`: Delivery date (default: tomorrow)

**Returns:** UUID of created order

**Validation:**
- Restaurant must exist and be active
- Items must be available
- Quantities must be positive
- Order deadline check (11:00 PM cutoff)

**Usage Example:**
```typescript
const orderItems = [
  { code: 'VEG_TOMATO', en: 'Tomato', hi: 'टमाटर', qty: 5.5, category: 'vegetables' }
];

const { data: orderId, error } = await supabase.rpc('create_order_from_items', {
  p_restaurant_slug: 'spicegarden',
  p_contact_name: 'John Doe',
  p_contact_phone: '+1234567890',
  p_items: orderItems,
  p_notes: 'Extra ripe tomatoes please'
});
```

### update_order_status

Updates order status with audit trail.

```sql
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_updated_by TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_order_id`: Order identifier
- `p_new_status`: New status value
- `p_updated_by`: Who made the change (optional)
- `p_notes`: Change notes (optional)

**Returns:** TRUE if update successful

**Status Validation:**
- Validates status transition rules
- Prevents invalid status changes
- Records audit trail

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('update_order_status', {
  p_order_id: '123e4567-e89b-12d3-a456-426614174000',
  p_new_status: 'confirmed',
  p_updated_by: 'admin@nutridelight.com',
  p_notes: 'Confirmed availability with supplier'
});
```

## Purchase Management Functions

### get_purchase_items

Aggregates purchase requirements from confirmed orders.

```sql
CREATE OR REPLACE FUNCTION get_purchase_items(
  p_purchase_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS TABLE (
  item_code TEXT,
  item_en TEXT,
  item_hi TEXT,
  category TEXT,
  total_qty NUMERIC,
  source_orders JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_purchase_date`: Date for purchase planning (default: tomorrow)

**Returns:** Aggregated purchase requirements by item

**Logic:**
- Summarizes quantities from confirmed orders
- Groups by item code
- Includes source order references
- Excludes cancelled or delivered orders

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('get_purchase_items', {
  p_purchase_date: '2026-01-22'
});
```

### create_purchase_plan

Creates or updates purchase plan for a specific date.

```sql
CREATE OR REPLACE FUNCTION create_purchase_plan(
  p_purchase_date DATE,
  p_item_code TEXT,
  p_ordered_qty NUMERIC,
  p_adjustment_qty NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_purchase_date`: Purchase date
- `p_item_code`: Item identifier
- `p_ordered_qty`: Quantity from customer orders
- `p_adjustment_qty`: Manual adjustment (+/-)
- `p_notes`: Purchase notes

**Returns:** UUID of purchase plan record

**Logic:**
- Calculates final quantity (ordered + adjustment)
- Updates existing plan or creates new one
- Validates item exists in catalog

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('create_purchase_plan', {
  p_purchase_date: '2026-01-22',
  p_item_code: 'VEG_TOMATO',
  p_ordered_qty: 50.5,
  p_adjustment_qty: 5.0,
  p_notes: 'Extra for weekend demand'
});
```

### finalize_purchase_plan

Finalizes purchase plan and generates procurement requirements.

```sql
CREATE OR REPLACE FUNCTION finalize_purchase_plan(
  p_purchase_date DATE
)
RETURNS TABLE (
  item_code TEXT,
  item_en TEXT,
  final_qty NUMERIC,
  supplier_recommendations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_purchase_date`: Purchase date to finalize

**Returns:** Finalized purchase requirements

**Logic:**
- Locks purchase plan for the date
- Generates supplier recommendations
- Creates procurement records
- Updates stock projections

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('finalize_purchase_plan', {
  p_purchase_date: '2026-01-22'
});
```

## Sales and Invoicing Functions

### create_invoice_from_orders

Creates sales invoice from delivered orders.

```sql
CREATE OR REPLACE FUNCTION create_invoice_from_orders(
  p_order_ids UUID[],
  p_invoice_date DATE DEFAULT CURRENT_DATE,
  p_discount_amount NUMERIC DEFAULT 0,
  p_other_charges NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_order_ids`: Array of order IDs to invoice
- `p_invoice_date`: Invoice date (default: today)
- `p_discount_amount`: Total discount amount
- `p_other_charges`: Additional charges
- `p_notes`: Invoice notes

**Returns:** UUID of created invoice

**Validation:**
- Orders must be in 'delivered' status
- Orders must belong to same restaurant
- Orders must not be already invoiced
- Calculates totals automatically

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('create_invoice_from_orders', {
  p_order_ids: [
    '123e4567-e89b-12d3-a456-426614174000',
    '456e7890-e89b-12d3-a456-426614174001'
  ],
  p_discount_amount: 50.00,
  p_notes: 'Bulk order discount'
});
```

### calculate_invoice_totals

Calculates invoice totals with taxes and discounts.

```sql
CREATE OR REPLACE FUNCTION calculate_invoice_totals(
  p_invoice_id UUID
)
RETURNS TABLE (
  subtotal NUMERIC,
  discount_amount NUMERIC,
  other_charges NUMERIC,
  tax_amount NUMERIC,
  grand_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_invoice_id`: Invoice identifier

**Returns:** Calculated totals breakdown

**Logic:**
- Sums line item totals
- Applies discounts
- Calculates taxes (if applicable)
- Returns comprehensive breakdown

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('calculate_invoice_totals', {
  p_invoice_id: '789e0123-e89b-12d3-a456-426614174002'
});
```

### apply_invoice_payment

Records payment against an invoice.

```sql
CREATE OR REPLACE FUNCTION apply_invoice_payment(
  p_invoice_id UUID,
  p_payment_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  paid_amount NUMERIC,
  due_amount NUMERIC,
  payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_invoice_id`: Invoice identifier
- `p_payment_amount`: Payment amount
- `p_payment_method`: Payment method (cash, transfer, cheque, etc.)
- `p_payment_reference`: Payment reference number
- `p_payment_date`: Payment date

**Returns:** Updated payment status

**Logic:**
- Validates payment amount
- Updates paid amount
- Recalculates due amount
- Updates payment status
- Creates accounting entries

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('apply_invoice_payment', {
  p_invoice_id: '789e0123-e89b-12d3-a456-426614174002',
  p_payment_amount: 1500.00,
  p_payment_method: 'bank_transfer',
  p_payment_reference: 'TXN123456789'
});
```

## Accounting Functions

### create_sales_journal_entry

Creates accounting journal entry for sales transaction.

```sql
CREATE OR REPLACE FUNCTION create_sales_journal_entry(
  p_invoice_id UUID,
  p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_invoice_id`: Invoice identifier
- `p_transaction_date`: Transaction date

**Returns:** Journal entry ID

**Logic:**
- Creates journal entry
- Debits accounts receivable
- Credits sales revenue
- Handles taxes if applicable

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('create_sales_journal_entry', {
  p_invoice_id: '789e0123-e89b-12d3-a456-426614174002',
  p_transaction_date: '2026-01-22'
});
```

### create_purchase_journal_entry

Creates accounting journal entry for purchase transaction.

```sql
CREATE OR REPLACE FUNCTION create_purchase_journal_entry(
  p_purchase_plan_id UUID,
  p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_purchase_plan_id`: Purchase plan identifier
- `p_transaction_date`: Transaction date

**Returns:** Journal entry ID

**Logic:**
- Creates journal entry
- Debits inventory/purchases
- Credits accounts payable
- Handles cost allocation

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('create_purchase_journal_entry', {
  p_purchase_plan_id: '012e3456-e89b-12d3-a456-426614174003',
  p_transaction_date: '2026-01-22'
});
```

## Reporting Functions

### get_daily_sales_report

Generates daily sales report with metrics.

```sql
CREATE OR REPLACE FUNCTION get_daily_sales_report(
  p_report_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_orders INTEGER,
  total_invoices INTEGER,
  total_revenue NUMERIC,
  total_paid NUMERIC,
  total_due NUMERIC,
  average_order_value NUMERIC,
  top_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_report_date`: Report date (default: today)

**Returns:** Daily sales metrics

**Metrics Included:**
- Order count and invoice count
- Revenue totals and payments
- Average order value
- Top-selling items

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('get_daily_sales_report', {
  p_report_date: '2026-01-22'
});
```

### get_purchase_efficiency_report

Analyzes purchase planning efficiency.

```sql
CREATE OR REPLACE FUNCTION get_purchase_efficiency_report(
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  purchase_date DATE,
  planned_items INTEGER,
  actual_items INTEGER,
  variance_percentage NUMERIC,
  cost_variance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_date_from`: Start date for analysis
- `p_date_to`: End date for analysis

**Returns:** Purchase efficiency metrics

**Metrics Included:**
- Planning vs actual quantities
- Cost variance analysis
- Efficiency percentages

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('get_purchase_efficiency_report', {
  p_date_from: '2026-01-01',
  p_date_to: '2026-01-31'
});
```

## Utility Functions

### generate_order_reference

Generates unique order reference numbers.

```sql
CREATE OR REPLACE FUNCTION generate_order_reference(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_date`: Date for reference generation

**Returns:** Unique order reference (e.g., "ORD-250201-12345")

**Format:** ORD-YYMMDD-NNNNN

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('generate_order_reference', {
  p_date: '2026-01-22'
});
```

### generate_invoice_number

Generates unique invoice numbers.

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_date`: Date for invoice number

**Returns:** Unique invoice number (e.g., "SI-20260122-12345")

**Format:** SI-YYYYMMDD-NNNNN

**Usage Example:**
```typescript
const { data, error } = await supabase.rpc('generate_invoice_number', {
  p_date: '2026-01-22'
});
```

### validate_item_availability

Checks if items are available for ordering.

```sql
CREATE OR REPLACE FUNCTION validate_item_availability(
  p_items JSONB
)
RETURNS TABLE (
  item_code TEXT,
  is_available BOOLEAN,
  available_qty NUMERIC,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_items`: JSON array of items to validate

**Returns:** Availability status for each item

**Validation Checks:**
- Item exists in catalog
- Item is currently available
- Sufficient stock (if applicable)
- Returns appropriate messages

**Usage Example:**
```typescript
const itemsToCheck = [
  { code: 'VEG_TOMATO', qty: 5.5 },
  { code: 'VEG_POTATO', qty: 10.0 }
];

const { data, error } = await supabase.rpc('validate_item_availability', {
  p_items: itemsToCheck
});
```

## Error Handling

All RPC functions include comprehensive error handling:

```sql
BEGIN
  -- Function logic here
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in function_name: %', SQLERRM;
END;
```

**Common Error Types:**
- Validation errors (invalid parameters)
- Business rule violations
- Data integrity issues
- Permission denied errors

## Performance Considerations

### Function Optimization
- Use appropriate indexes
- Minimize data transfer
- Batch operations when possible
- Use set-based operations

### Security
- All functions are SECURITY DEFINER
- Input validation and sanitization
- Row Level Security respected
- Audit logging for sensitive operations

### Monitoring
- Track function execution times
- Monitor error rates
- Log slow queries
- Performance tuning based on usage

## Usage Patterns

### Transaction Management
```sql
BEGIN;
SELECT create_order_from_items(...);
SELECT update_order_status(...);
COMMIT;
```

### Batch Operations
```sql
SELECT create_purchase_plan(date, item, qty) 
FROM unnest(items_array);
```

### Error Recovery
```sql
BEGIN;
-- Try operation
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  -- Handle error
END;
```

These RPC functions provide a robust, type-safe API for complex database operations while maintaining security and performance standards.
