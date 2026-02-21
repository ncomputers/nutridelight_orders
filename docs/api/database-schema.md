# Database Schema Documentation

## Overview

The Nutridelight Orders database is built on PostgreSQL and managed through Supabase. The schema follows a normalized design with clear relationships between entities and comprehensive row-level security policies.

## Core Tables

### restaurants

Stores restaurant/customer information.

```sql
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `name`: Restaurant display name
- `slug`: URL-friendly unique identifier
- `is_active`: Whether restaurant can place orders
- `created_at`: Record creation timestamp

**Relationships:**
- One-to-many with `orders`
- One-to-many with `sales_invoices`

**Security Policies:**
- Public read access
- Admin-only write access

### orders

Stores customer orders and their details.

```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref TEXT UNIQUE,
  restaurant_id UUID REFERENCES public.restaurants(id),
  restaurant_name TEXT,
  restaurant_slug TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  order_date DATE,
  delivery_date DATE,
  items JSONB,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `order_ref`: Human-readable order reference (e.g., "ORD-250201-12345")
- `restaurant_id`: Foreign key to restaurants
- `restaurant_name`: Denormalized restaurant name
- `restaurant_slug`: Denormalized restaurant slug
- `contact_name`: Order contact person
- `contact_phone`: Contact phone number
- `order_date`: Date order was placed
- `delivery_date`: Expected delivery date
- `items`: JSON array of ordered items
- `notes`: Special order notes
- `status`: Order status (pending, confirmed, purchase_done, out_for_delivery, delivered, invoiced, failed, rejected)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Items JSON Structure:**
```json
[
  {
    "code": "VEG_TOMATO",
    "en": "Tomato",
    "hi": "टमाटर",
    "qty": 5.5,
    "category": "vegetables"
  }
]
```

**Relationships:**
- Many-to-one with `restaurants`
- One-to-one with `sales_invoices`

**Security Policies:**
- Public insert access (for order submission)
- Public read access (for order tracking)
- Admin update access (for order management)

### item_availability

Manages stock availability for produce items.

```sql
CREATE TABLE public.item_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE NOT NULL,
  item_en TEXT NOT NULL,
  item_hi TEXT,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  stock_qty NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  item_icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `item_code`: Unique item identifier
- `item_en`: English item name
- `item_hi`: Hindi item name
- `category`: Item category (vegetables, herbs, fruits)
- `is_available`: Whether item can be ordered
- `stock_qty`: Current stock quantity
- `unit`: Unit of measurement
- `item_icon_url`: URL to item icon image
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Security Policies:**
- Public read access
- Admin write access

### purchase_plans

Aggregates demand and manages purchase planning.

```sql
CREATE TABLE public.purchase_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL,
  item_en TEXT NOT NULL,
  item_hi TEXT,
  category TEXT,
  ordered_qty NUMERIC NOT NULL DEFAULT 0,
  adjustment_qty NUMERIC NOT NULL DEFAULT 0,
  final_qty NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  source_orders JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (purchase_date, item_en)
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `purchase_date`: Date for purchase
- `item_en`: English item name
- `item_hi`: Hindi item name
- `category`: Item category
- `ordered_qty`: Total quantity from customer orders
- `adjustment_qty`: Manual adjustments (+/-)
- `final_qty`: Final purchase quantity
- `notes`: Purchase notes
- `source_orders`: JSON array of source order IDs
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Security Policies:**
- Public read access
- Admin write access

### sales_invoices

Manages customer billing and invoicing.

```sql
CREATE TABLE public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  restaurant_name TEXT NOT NULL,
  restaurant_slug TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'cancelled')),
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  other_charges NUMERIC NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
  grand_total NUMERIC NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  paid_amount NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount NUMERIC NOT NULL DEFAULT 0 CHECK (due_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  finalized_by TEXT,
  UNIQUE (order_id)
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `invoice_no`: Human-readable invoice number
- `order_id`: Foreign key to orders
- `restaurant_id`: Foreign key to restaurants
- `restaurant_name`: Denormalized restaurant name
- `restaurant_slug`: Denormalized restaurant slug
- `invoice_date`: Invoice creation date
- `delivery_date`: Actual delivery date
- `status`: Invoice status (draft, finalized, cancelled)
- `subtotal`: Sum of line items
- `discount_amount`: Total discount
- `other_charges`: Additional charges
- `grand_total`: Final amount due
- `paid_amount`: Amount paid so far
- `due_amount`: Remaining balance
- `payment_status`: Payment status (unpaid, partial, paid)
- `notes`: Invoice notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp
- `finalized_at`: Invoice finalization timestamp
- `finalized_by`: Who finalized the invoice

**Relationships:**
- Many-to-one with `orders`
- Many-to-one with `restaurants`
- One-to-many with `sales_invoice_lines`

**Security Policies:**
- Public read access
- Admin write access

### sales_invoice_lines

Stores individual line items for sales invoices.

```sql
CREATE TABLE public.sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  item_code TEXT,
  item_en TEXT NOT NULL,
  item_hi TEXT,
  qty NUMERIC NOT NULL DEFAULT 0 CHECK (qty >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  line_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `invoice_id`: Foreign key to sales_invoices
- `item_code`: Item identifier
- `item_en`: English item name
- `item_hi`: Hindi item name
- `qty`: Quantity delivered
- `unit`: Unit of measurement
- `unit_price`: Price per unit
- `line_total`: Total for this line (qty * unit_price)
- `line_note`: Line-specific notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Relationships:**
- Many-to-one with `sales_invoices`

**Security Policies:**
- Public read access
- Admin write access

## Accounting Tables

### account_ledgers

Chart of accounts for double-entry bookkeeping.

```sql
CREATE TABLE public.account_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ledger_group TEXT,
  account_type TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `code`: Account code (e.g., 'ACCOUNTS_RECEIVABLE')
- `name`: Account display name
- `ledger_group`: Account grouping
- `account_type`: Asset, Liability, Equity, Income, Expense
- `is_system`: Whether this is a system account
- `created_at`: Record creation timestamp

### account_journals

Journal entries for accounting transactions.

```sql
CREATE TABLE public.account_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### journal_entries

Individual debit/credit entries.

```sql
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.account_journals(id) ON DELETE CASCADE,
  ledger_id UUID NOT NULL REFERENCES public.account_ledgers(id),
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Enhanced Features Tables

### restaurant_portal_settings

Stores restaurant portal configuration and authentication.

```sql
CREATE TABLE public.restaurant_portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (restaurant_id)
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `restaurant_id`: Associated restaurant
- `username`: Portal username
- `pin_hash`: Hashed PIN for authentication
- `is_active`: Whether portal access is enabled
- `last_login_at`: Last successful login timestamp
- `login_attempts`: Failed login attempt count
- `locked_until`: Account lockout expiration
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Security Policies:**
- Restaurant can read/write own settings
- Admin can manage all settings

### restaurant_support_issues

Tracks support requests from restaurant portal.

```sql
CREATE TABLE public.restaurant_support_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  order_id UUID REFERENCES public.orders(id),
  issue_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  resolution_note TEXT,
  resolved_by UUID REFERENCES public.app_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `restaurant_id`: Restaurant creating the issue
- `order_id`: Related order (optional)
- `issue_type`: Type of issue (order, billing, technical, other)
- `title`: Issue title/summary
- `description`: Detailed issue description
- `priority`: Issue priority (low, medium, high, urgent)
- `status`: Issue status (open, in_progress, resolved, closed)
- `resolution_note`: Resolution details
- `resolved_by`: Admin who resolved the issue
- `resolved_at`: Resolution timestamp
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

### local_stores

Manages multiple store/warehouse locations.

```sql
CREATE TABLE public.local_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  location_type TEXT DEFAULT 'store',
  address TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  is_central_warehouse BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `store_code`: Unique store identifier
- `store_name`: Display name
- `location_type`: Type (store, warehouse, central)
- `address`: Physical address
- `contact_phone`: Contact number
- `is_active`: Whether location is active
- `is_central_warehouse`: Central warehouse flag
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

### stock_transfers

Tracks stock transfers between locations.

```sql
CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no TEXT UNIQUE NOT NULL,
  from_store_id UUID NOT NULL REFERENCES public.local_stores(id),
  to_store_id UUID NOT NULL REFERENCES public.local_stores(id),
  transfer_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.app_users(id),
  approved_by UUID REFERENCES public.app_users(id),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `transfer_no`: Unique transfer number
- `from_store_id`: Source location
- `to_store_id`: Destination location
- `transfer_date`: Transfer date
- `status`: Transfer status (pending, approved, in_transit, completed, cancelled)
- `notes`: Transfer notes
- `created_by`: User who created transfer
- `approved_by`: User who approved transfer
- `approved_at`: Approval timestamp
- `completed_at`: Completion timestamp
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

### stock_transfer_lines

Line items for stock transfers.

```sql
CREATE TABLE public.stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  qty NUMERIC NOT NULL CHECK (qty > 0),
  unit TEXT DEFAULT 'kg',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `transfer_id`: Parent transfer ID
- `item_code`: Item identifier
- `item_name`: Item display name
- `qty`: Transfer quantity
- `unit`: Unit of measurement
- `notes`: Line item notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

### purchase_stock_history

Tracks daily stock movements for purchase planning.

```sql
CREATE TABLE public.purchase_stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  opening_qty NUMERIC DEFAULT 0,
  purchased_qty NUMERIC DEFAULT 0,
  sold_qty NUMERIC DEFAULT 0,
  transferred_in_qty NUMERIC DEFAULT 0,
  transferred_out_qty NUMERIC DEFAULT 0,
  closing_qty NUMERIC DEFAULT 0,
  wastage_qty NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (purchase_date, item_code)
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `purchase_date`: Date of stock movement
- `item_code`: Item identifier
- `item_name`: Item display name
- `opening_qty`: Opening stock quantity
- `purchased_qty`: Quantity purchased
- `sold_qty`: Quantity sold to customers
- `transferred_in_qty`: Quantity received from transfers
- `transferred_out_qty`: Quantity sent via transfers
- `closing_qty`: Closing stock quantity
- `wastage_qty`: Quantity wasted/lost
- `created_at`: Record creation timestamp

### audit_status_transitions

Audit trail for status changes.

```sql
CREATE TABLE public.audit_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `table_name`: Table where change occurred
- `record_id`: ID of affected record
- `old_status`: Previous status value
- `new_status`: New status value
- `actor_type`: Type of actor (user, system, rpc)
- `actor_id`: ID of actor who made change
- `actor_name`: Name/description of actor
- `reason`: Reason for status change
- `metadata`: Additional context data
- `created_at`: Timestamp of change

### warehouse_config

Configuration for warehouse operations.

```sql
CREATE TABLE public.warehouse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `config_key`: Configuration key
- `config_value`: Configuration value
- `description`: Configuration description
- `is_active`: Whether configuration is active
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

## System Tables

### app_users

System user accounts for admin access.

```sql
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### daily_settlements

Daily financial settlement records.

```sql
CREATE TABLE public.daily_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_date DATE UNIQUE NOT NULL,
  opening_balance NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  total_purchases NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Indexes

### Performance Indexes

```sql
-- Orders
CREATE INDEX idx_orders_restaurant_date ON public.orders (restaurant_id, order_date);
CREATE INDEX idx_orders_status_date ON public.orders (status, order_date);
CREATE INDEX idx_orders_delivery_date ON public.orders (delivery_date);

-- Sales Invoices
CREATE INDEX idx_sales_invoices_date_status ON public.sales_invoices (invoice_date, status);
CREATE INDEX idx_sales_invoices_order_id ON public.sales_invoices (order_id);
CREATE INDEX idx_sales_invoices_restaurant_id ON public.sales_invoices (restaurant_id);

-- Purchase Plans
CREATE INDEX idx_purchase_plans_date ON public.purchase_plans (purchase_date);
CREATE INDEX idx_purchase_plans_item ON public.purchase_plans (item_en);

-- Item Availability
CREATE INDEX idx_item_availability_category ON public.item_availability (category);
CREATE INDEX idx_item_availability_available ON public.item_availability (is_available);
```

## Row Level Security (RLS)

### Security Policies Overview

All tables have Row Level Security enabled with appropriate policies:

1. **Public Tables** (restaurants, orders, item_availability):
   - Public read access for customer-facing features
   - Admin write access for management

2. **Admin Tables** (purchase_plans, sales_invoices, accounting):
   - Admin-only access for all operations
   - Role-based restrictions if needed

3. **System Tables** (app_users, daily_settlements):
   - System admin access only
   - Strict role-based permissions

### Policy Examples

```sql
-- Public read for restaurants
CREATE POLICY "public read restaurants" 
ON public.restaurants 
FOR SELECT 
USING (true);

-- Admin insert for orders
CREATE POLICY "admin insert orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Own user read for app_users
CREATE POLICY "own user read" 
ON public.app_users 
FOR SELECT 
USING (auth.uid()::text = id::text);
```

## Data Integrity

### Constraints

1. **Foreign Key Constraints**: Ensure referential integrity
2. **Check Constraints**: Validate data ranges and enums
3. **Unique Constraints**: Prevent duplicate records
4. **Not Null Constraints**: Ensure required fields

### Triggers

1. **Updated Timestamp**: Auto-update `updated_at` fields
2. **Invoice Calculations**: Auto-calculate invoice totals
3. **Order References**: Auto-generate order references
4. **Audit Trail**: Log important changes

## Migration Strategy

### Migration Naming Convention

```
YYYYMMDDHHMMSS_description.sql
```

Example: `20260217140240_add_purchase_plans.sql`

### Migration Process

1. Create migration file with descriptive name
2. Write SQL changes with proper up/down migrations
3. Test migration on development environment
4. Apply to staging for validation
5. Deploy to production with backup

### Rollback Strategy

- Always include rollback procedures
- Test rollback scenarios
- Maintain backup before major changes
- Document breaking changes

## Performance Considerations

### Query Optimization

1. **Index Usage**: Proper indexes on frequently queried columns
2. **Query Patterns**: Optimize for common access patterns
3. **Connection Pooling**: Use Supabase connection pooling
4. **Caching**: Implement application-level caching

### Monitoring

1. **Slow Queries**: Monitor and optimize slow queries
2. **Index Usage**: Track index effectiveness
3. **Connection Limits**: Monitor connection usage
4. **Storage Growth**: Track database size growth

## Backup and Recovery

### Backup Strategy

1. **Daily Backups**: Automated daily backups
2. **Point-in-Time Recovery**: 7-day retention
3. **Cross-Region Replication**: Disaster recovery
4. **Export Capabilities**: Data export tools

### Recovery Procedures

1. **Identify Recovery Point**: Determine needed recovery time
2. **Restore from Backup**: Use appropriate backup
3. **Validate Data**: Ensure data integrity
4. **Update Applications**: Reconnect applications

## Security

### Data Protection

1. **Encryption**: Data encrypted at rest and in transit
2. **Access Control**: Role-based access control
3. **Audit Logging**: Track all data access
4. **PII Protection**: Protect personal information

### Compliance

1. **Data Privacy**: Comply with privacy regulations
2. **Retention Policies**: Appropriate data retention
3. **Access Audits**: Regular access reviews
4. **Security Updates**: Keep system updated

## API Integration

### Supabase Client

The database is accessed through the Supabase client which provides:

1. **Auto-generated APIs**: RESTful APIs for all tables
2. **Real-time Subscriptions**: Live data updates
3. **Authentication**: Built-in user management
4. **File Storage**: Media and document storage

### Type Safety

TypeScript types are automatically generated from the database schema:

```typescript
export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: { id: string; name: string; slug: string; is_active: boolean; created_at: string }
        Insert: { name: string; slug: string; is_active?: boolean }
        Update: { name?: string; slug?: string; is_active?: boolean }
      }
      // ... other tables
    }
  }
}
```

This schema documentation provides a comprehensive overview of the Nutridelight Orders database structure, relationships, and operational considerations.
