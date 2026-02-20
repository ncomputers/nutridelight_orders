# Nutridelight Orders - Quick Reference Cheat Sheet

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database
```bash
# Start local Supabase
supabase start

# Run migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Reset database
supabase db reset
```

## Key URLs

### Development
- **Local App**: `http://localhost:5173`
- **Admin Panel**: `http://localhost:5173/admin`
- **Purchase Panel**: `http://localhost:5173/purchase`
- **Sales Panel**: `http://localhost:5173/sales`

### Production
- **Main App**: `https://app.nutridelight.com`
- **Admin**: `https://app.nutridelight.com/admin`
- **Order Page**: `https://app.nutridelight.com/order?r=[restaurant-slug]`

## Environment Variables

```bash
# Required
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_ADMIN_PASSWORD=your-admin-password

# Optional
VITE_ADMIN_POLL_INTERVAL_MS=15000
```

## Common File Locations

### Configuration
- `src/config/app.ts` - App configuration
- `src/config/navigation.ts` - Navigation config
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind CSS config

### Data Types
- `src/integrations/supabase/types.ts` - Database types
- `src/data/items.ts` - Product catalog
- `src/data/itemIcons.ts` - Item icon mappings

### Features
- `src/features/order/` - Customer ordering
- `src/features/sales/` - Invoicing and sales
- `src/features/admin/` - Admin operations
- `src/features/purchase/` - Purchase planning

## Order Status Flow

```
pending → confirmed → purchase_done → out_for_delivery → delivered → invoiced
```

### Status Meanings
- **pending**: Order received, awaiting confirmation
- **confirmed**: Order verified and scheduled
- **purchase_done**: Items procured from suppliers
- **out_for_delivery**: Order on the way
- **delivered**: Order received by customer
- **invoiced**: Invoice generated

## Invoice Status Flow

```
draft → finalized → paid
```

### Status Meanings
- **draft**: Invoice being prepared
- **finalized**: Invoice sent to customer
- **paid**: Full payment collected
- **partial**: Partial payment received
- **overdue**: Payment past due date

## Common React Query Patterns

### Fetching Data
```typescript
const { data, error, isLoading } = useQuery({
  queryKey: ['orders', { status: 'pending' }],
  queryFn: () => getOrders({ status: 'pending' })
});
```

### Mutating Data
```typescript
const mutation = useMutation({
  mutationFn: updateOrderStatus,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }
});
```

### Custom Hook Pattern
```typescript
export const useOrders = (filters: OrderFilters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => getOrders(filters)
  });
};
```

## Common Repository Patterns

### Order Repository
```typescript
export const orderRepository = {
  getOrders: (filters: OrderFilters) => 
    supabase.from('orders').select('*').eq('status', filters.status),
  
  createOrder: (order: CreateOrder) =>
    supabase.from('orders').insert(order).select().single(),
  
  updateOrderStatus: (id: string, status: string) =>
    supabase.from('orders').update({ status }).eq('id', id)
};
```

## Common Component Patterns

### Form with Validation
```typescript
const OrderForm = () => {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: { items: [], notes: '' }
  });
  
  const onSubmit = (data: OrderFormData) => {
    createOrder(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
};
```

### Data Table
```typescript
const OrdersTable = ({ orders }: { orders: Order[] }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order Ref</TableHead>
          <TableHead>Restaurant</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>{order.order_ref}</TableCell>
            <TableCell>{order.restaurant_name}</TableCell>
            <TableCell>{order.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

## Common Business Logic

### Order Reference Generation
```typescript
const generateOrderRef = (date: Date): string => {
  const dateStr = date.toISOString().slice(2, 10).replace('-', '');
  const random = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${dateStr}-${random}`;
};
```

### Quantity Rounding
```typescript
const roundQuantity = (value: number): number => {
  return Math.round(value * 10) / 10; // Round to 0.1 kg
};
```

### Status Validation
```typescript
const isValidStatusTransition = (from: string, to: string): boolean => {
  const validTransitions = {
    pending: ['confirmed', 'rejected'],
    confirmed: ['purchase_done'],
    purchase_done: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
    delivered: ['invoiced']
  };
  
  return validTransitions[from]?.includes(to) || false;
};
```

## Common Database Queries

### Get Orders with Restaurant
```sql
SELECT 
  o.*,
  r.name as restaurant_name,
  r.slug as restaurant_slug
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC;
```

### Get Purchase Requirements
```sql
SELECT 
  item_en,
  SUM(qty) as total_qty,
  JSON_AGG(JSON_BUILD_OBJECT('order_id', order_id, 'qty', qty)) as source_orders
FROM orders,
  jsonb_array_elements(items) as item
WHERE status = 'confirmed'
GROUP BY item_en;
```

### Get Invoice Totals
```sql
SELECT 
  i.invoice_no,
  i.grand_total,
  i.paid_amount,
  i.due_amount,
  i.payment_status,
  SUM(il.line_total) as line_total_sum
FROM sales_invoices i
LEFT JOIN sales_invoice_lines il ON i.id = il.invoice_id
WHERE i.invoice_date = CURRENT_DATE
GROUP BY i.id;
```

## Common Error Handling

### API Error Handling
```typescript
const handleApiError = (error: any) => {
  if (error.code === 'PGRST116') {
    toast.error('Record not found');
  } else if (error.code === '23505') {
    toast.error('Duplicate record');
  } else {
    toast.error('An error occurred');
  }
};
```

### Form Error Handling
```typescript
const onSubmit = async (data: FormData) => {
  try {
    await createOrder(data);
    toast.success('Order created successfully');
  } catch (error) {
    if (error instanceof ValidationError) {
      form.setError('root', { message: error.message });
    } else {
      handleApiError(error);
    }
  }
};
```

## Common UI Patterns

### Loading States
```typescript
if (isLoading) {
  return <div>Loading...</div>;
}

if (error) {
  return <div>Error: {error.message}</div>;
}
```

### Conditional Rendering
```typescript
{orders.length === 0 ? (
  <div>No orders found</div>
) : (
  <OrdersTable orders={orders} />
)}
```

### Status Badges
```typescript
const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800'
  };
  
  return (
    <Badge className={colors[status]}>
      {status}
    </Badge>
  );
};
```

## Common Testing Patterns

### Component Test
```typescript
test('renders order table', () => {
  const mockOrders = [
    { id: '1', order_ref: 'ORD-123', restaurant_name: 'Test Restaurant' }
  ];
  
  render(<OrdersTable orders={mockOrders} />);
  
  expect(screen.getByText('ORD-123')).toBeInTheDocument();
  expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
});
```

### Hook Test
```typescript
test('useOrders returns orders data', async () => {
  const mockOrders = [{ id: '1', order_ref: 'ORD-123' }];
  
  (getOrders as jest.Mock).mockResolvedValue(mockOrders);
  
  const { result } = renderHook(() => useOrders({ status: 'pending' }));
  
  await waitFor(() => {
    expect(result.current.data).toEqual(mockOrders);
  });
});
```

## Common Debugging Tips

### Console Logging
```typescript
console.log('Order data:', order);
console.log('Form values:', form.getValues());
console.log('Query key:', queryKey);
```

### React DevTools
- Check component props and state
- Inspect React Query cache
- View component hierarchy

### Network Tab
- Check API requests and responses
- Verify query parameters
- Inspect error responses

## Common Performance Tips

### React Query Optimization
```typescript
// Use staleTime for data that doesn't change often
useQuery({
  queryKey: ['restaurants'],
  queryFn: getRestaurants,
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

### Component Optimization
```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Memoize event handlers
const handleClick = useCallback(() => {
  onClick(item.id);
}, [onClick, item.id]);
```

## Common Security Tips

### Environment Variables
- Never commit `.env` files
- Use different values for development/production
- Rotate secrets regularly

### Data Validation
```typescript
// Validate user input
const orderSchema = z.object({
  restaurant_slug: z.string().min(1),
  items: z.array(z.object({
    code: z.string(),
    qty: z.number().min(0)
  }))
});
```

### Row Level Security
- Enable RLS on all tables
- Use appropriate policies
- Test with different user roles

## Common Deployment Steps

### Build and Deploy
```bash
# Build for production
npm run build

# Deploy to hosting
# (platform-specific commands)
```

### Environment Setup
1. Set production environment variables
2. Run database migrations
3. Update Supabase configuration
4. Test deployment

## Common Troubleshooting

### Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm run build -- --force`
- Check TypeScript errors

### Runtime Issues
- Check browser console for errors
- Verify environment variables
- Check network requests
- Review Supabase logs

### Database Issues
- Check connection string
- Verify RLS policies
- Test queries in Supabase dashboard
- Check migration status

## Quick Commands Summary

```bash
# Development
npm run dev                    # Start dev server
npm test                      # Run tests
npm run lint                   # Check code quality
npm run build                  # Build for production

# Database
supabase start                 # Start local DB
supabase db push              # Apply migrations
supabase gen types            # Generate types

# Git
git checkout -b feature-name  # Create feature branch
git add .                     # Stage changes
git commit -m "feat: add feature" # Commit
git push origin feature-name  # Push to remote
```

This cheat sheet provides quick reference for common tasks and patterns in the Nutridelight Orders project.
