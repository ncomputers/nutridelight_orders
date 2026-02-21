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

### validate_order_status_transition

Validates if an order status transition is allowed according to business rules.

```sql
CREATE OR REPLACE FUNCTION validate_order_status_transition(old_status text, new_status text)
RETURNS boolean
LANGUAGE plpgsql
```

**Parameters:**
- `old_status`: Current order status
- `new_status`: Desired new status

**Returns:** Boolean indicating if transition is valid

**Valid Transitions:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `purchase_done`, `cancelled`
- `purchase_done` → `out_for_delivery`, `cancelled`
- `out_for_delivery` → `delivered`, `cancelled`
- `delivered` → `invoiced`

## Sales and Invoicing Functions

### create_invoice_from_order

Creates a sales invoice from a single order.

```sql
CREATE OR REPLACE FUNCTION create_invoice_from_order(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_order_id`: UUID of the order to invoice

**Returns:** UUID of the created invoice

**Logic:**
1. Validates order exists and has restaurant_id
2. Checks if invoice already exists for order
3. Generates unique invoice number
4. Creates invoice with order details
5. Creates invoice line items from order items
6. Calculates totals and payment status

### create_invoice_from_orders

Creates a consolidated sales invoice from multiple orders.

```sql
CREATE OR REPLACE FUNCTION create_invoice_from_orders(p_order_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_order_ids`: Array of order UUIDs to include in invoice

**Returns:** UUID of the created invoice

**Logic:**
1. Validates all orders exist and belong to same restaurant
2. Generates unique invoice number
3. Creates consolidated invoice
4. Creates line items from all orders
5. Calculates combined totals

### validate_invoice_status_transition

Validates if an invoice status transition is allowed.

```sql
CREATE OR REPLACE FUNCTION validate_invoice_status_transition(old_status text, new_status text)
RETURNS boolean
LANGUAGE plpgsql
```

**Parameters:**
- `old_status`: Current invoice status
- `new_status`: Desired new status

**Returns:** Boolean indicating if transition is valid

**Valid Transitions:**
- `draft` → `finalized`, `cancelled`
- `finalized` → `cancelled`

## Purchase Management Functions

### get_purchase_demand

Calculates purchase demand for a specific date.

```sql
CREATE OR REPLACE FUNCTION get_purchase_demand(
  p_purchase_date date,
  p_need_mode text default null
)
RETURNS table (
  item_code text,
  item_name text,
  demand_qty numeric,
  stock_qty numeric,
  need_qty numeric,
  category text
)
LANGUAGE plpgsql
```

**Parameters:**
- `p_purchase_date`: Date to calculate demand for
- `p_need_mode`: Calculation mode ('net', 'gross', etc.)

**Returns:** Purchase demand breakdown by item

### get_purchase_items

Retrieves purchase items with status for a specific date.

```sql
CREATE OR REPLACE FUNCTION get_purchase_items(p_purchase_date date default current_date)
RETURNS table (
  item_code text,
  item_name text,
  required_qty numeric,
  purchased_qty numeric,
  remaining_qty numeric,
  status text
)
LANGUAGE sql
```

**Parameters:**
- `p_purchase_date`: Purchase date (default: today)

**Returns:** Purchase items with quantities and status

**Status Values:**
- `pending`: Still need to purchase
- `completed`: Fully purchased
- `over`: Over-purchased

### finalize_purchase

Finalizes purchase planning for a specific day.

```sql
CREATE OR REPLACE FUNCTION finalize_purchase(p_purchase_day_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_purchase_day_id`: UUID of purchase day to finalize

**Returns:** JSON with finalization results

**Logic:**
1. Validates purchase day can be finalized
2. Updates purchase plan statuses
3. Generates carry-forward for next day
4. Updates stock quantities
5. Creates audit trail

### get_purchase_stock_history

Retrieves purchase stock history for a date range.

```sql
CREATE OR REPLACE FUNCTION get_purchase_stock_history(
  p_from_date date,
  p_to_date date
)
RETURNS table (
  purchase_date date,
  item_code text,
  item_name text,
  opening_qty numeric,
  purchased_qty numeric,
  sold_qty numeric,
  closing_qty numeric
)
LANGUAGE sql
```

**Parameters:**
- `p_from_date`: Start date for history
- `p_to_date`: End date for history

**Returns:** Stock movement history

## Restaurant Portal Functions

### restaurant_portal_login

Authenticates restaurant user for portal access.

```sql
CREATE OR REPLACE FUNCTION restaurant_portal_login(
  p_username text,
  p_pin text,
  p_user_agent text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_username`: Restaurant username
- `p_pin`: PIN for authentication
- `p_user_agent`: User agent string (optional)

**Returns:** JSON with session token and user info

### restaurant_portal_me

Retrieves current restaurant user information.

```sql
CREATE OR REPLACE FUNCTION restaurant_portal_me(p_session_token text)
RETURNS table (
  restaurant_id uuid,
  restaurant_name text,
  username text,
  session_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_session_token`: Session token from login

**Returns:** Restaurant user information

### restaurant_portal_dashboard

Retrieves dashboard data for restaurant portal.

```sql
CREATE OR REPLACE FUNCTION restaurant_portal_dashboard(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_session_token`: Valid session token

**Returns:** JSON with dashboard statistics and recent orders

### restaurant_portal_list_orders

Lists orders for the restaurant.

```sql
CREATE OR REPLACE FUNCTION restaurant_portal_list_orders(
  p_session_token text,
  p_limit integer default 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_session_token`: Valid session token
- `p_limit`: Maximum orders to return

**Returns:** JSON with order list

### restaurant_portal_create_support_issue

Creates a support issue from restaurant portal.

```sql
CREATE OR REPLACE FUNCTION restaurant_portal_create_support_issue(
  p_session_token text,
  p_order_id uuid default null,
  p_issue_type text default 'other',
  p_description text,
  p_priority text default 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_session_token`: Valid session token
- `p_order_id`: Related order (optional)
- `p_issue_type`: Type of issue
- `p_description`: Issue description
- `p_priority`: Issue priority

**Returns:** UUID of created support issue

## Local Store and Transfer Functions

### create_stock_transfer

Creates a stock transfer between locations.

```sql
CREATE OR REPLACE FUNCTION create_stock_transfer(
  p_from_location_code text,
  p_to_location_code text,
  p_lines jsonb,
  p_notes text default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_from_location_code`: Source location code
- `p_to_location_code`: Destination location code
- `p_lines`: JSON array of transfer line items
- `p_notes`: Transfer notes (optional)

**Returns:** UUID of created transfer

**Line Item Format:**
```json
[
  {
    "item_code": "TOMATO",
    "qty": 10.5,
    "notes": "Ripe tomatoes"
  }
]
```

### generate_carry_forward_for_day

Generates carry-forward stock for next day.

```sql
CREATE OR REPLACE FUNCTION generate_carry_forward_for_day(p_purchase_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
```

**Parameters:**
- `p_purchase_date`: Date to generate carry-forward for

**Returns:** Number of items processed

## System and Audit Functions

### audit_status_transition

Creates audit trail for status changes.

```sql
CREATE OR REPLACE FUNCTION audit_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
```

**Used as:** Trigger on orders and sales_invoices tables

**Captures:**
- Table name and record ID
- Old and new status values
- User who made the change
- Timestamp of change
- Reason for change (if provided)

### sync_order_items_from_order

Synchronizes order items when order is updated.

```sql
CREATE OR REPLACE FUNCTION sync_order_items_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
```

**Used as:** Trigger on orders table

**Logic:**
- Extracts items from order JSON
- Updates item_availability table
- Maintains stock quantities

## Utility Functions

### assert_journal_voucher_balanced

Ensures accounting journal vouchers are balanced.

```sql
CREATE OR REPLACE FUNCTION assert_journal_voucher_balanced(voucher_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
```

**Parameters:**
- `voucher_uuid`: UUID of journal voucher to check

**Logic:**
- Sums all debit and credit entries
- Raises exception if not balanced
- Used as constraint check

## Usage Examples

### Creating an Invoice
```typescript
const { data, error } = await supabase.rpc('create_invoice_from_order', {
  p_order_id: '123e4567-e89b-12d3-a456-426614174000'
});
```

### Getting Purchase Demand
```typescript
const { data, error } = await supabase.rpc('get_purchase_demand', {
  p_purchase_date: '2024-02-20',
  p_need_mode: 'net'
});
```

### Restaurant Portal Login
```typescript
const { data, error } = await supabase.rpc('restaurant_portal_login', {
  p_username: 'hotel_hilltop',
  p_pin: '1234',
  p_user_agent: navigator.userAgent
});
```

## Error Handling

All RPC functions follow consistent error handling:
- **Invalid parameters**: Raise exception with descriptive message
- **Permission denied**: Return null or raise security exception
- **Business rule violations**: Raise exception with rule explanation
- **System errors**: Log error and raise generic exception

## Performance Considerations

- Functions use `SECURITY DEFINER` where needed for proper permissions
- Complex queries include appropriate indexes
- Bulk operations minimize round trips
- Result sets are limited to prevent memory issues

## Security Notes

- All functions validate input parameters
- Row Level Security policies apply to function operations
- Sensitive operations require proper session context
- Audit trail maintained for critical operations

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
