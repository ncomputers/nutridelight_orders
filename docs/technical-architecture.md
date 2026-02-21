# Technical Architecture

## System Overview

Nutridelight Orders is a modern web application built with a clean, layered architecture that separates concerns and enables maintainable, scalable development.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router DOM for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend
- **Database**: PostgreSQL via Supabase
- **API**: Supabase auto-generated REST API
- **Authentication**: Supabase Auth with localStorage persistence
- **Real-time**: Supabase real-time subscriptions

### Development Tools
- **Testing**: Vitest with React Testing Library
- **Linting**: ESLint with TypeScript support
- **Package Management**: npm with package-lock.json
- **Environment**: Vite environment variables

## Architecture Layers

```
┌─────────────────────────────────────┐
│           Presentation Layer        │
│  (Pages, Components, UI Elements)  │
├─────────────────────────────────────┤
│           Business Logic Layer      │
│     (Domain Logic, Calculations)    │
├─────────────────────────────────────┤
│            Data Access Layer        │
│   (Repositories, Supabase Client)   │
├─────────────────────────────────────┤
│            Infrastructure Layer     │
│    (Database, Auth, External APIs)  │
└─────────────────────────────────────┘
```

## Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ItemIcon.tsx    # Item icon display
│   ├── ItemIconUploader.tsx # Icon upload component
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── TopTabs.tsx     # Top navigation tabs
│   └── ui/             # shadcn/ui components
├── pages/              # Route-level components
├── features/           # Feature-based modules
│   ├── order/         # Customer ordering
│   ├── sales/         # Invoicing and sales
│   ├── admin/         # Admin operations
│   ├── purchase/      # Purchase planning
│   └── restaurantPortal/ # Restaurant self-service
├── layouts/            # Layout components
│   ├── MainLayout.tsx # Main application layout
│   └── ModuleLayout.tsx # Feature-specific layout
├── lib/               # Utility functions
│   ├── datetime.ts    # Date/time utilities
│   ├── imageCompression.ts # Image processing
│   └── navigation.ts  # Navigation utilities
├── hooks/             # Custom React hooks
├── config/            # Application configuration
│   ├── app.ts         # App configuration
│   └── navigation.ts  # Navigation config
├── data/              # Static data and catalogs
│   ├── items.ts       # Product catalog
│   └── itemIcons.ts  # Item icon mappings
├── integrations/      # External service integrations
│   └── supabase/      # Supabase client setup
└── test/              # Test utilities and setup
```

## Feature Architecture

Each feature follows a consistent structure:

```
features/[feature]/
├── domain/           # Pure business logic
├── repositories/     # Data access layer
├── queryKeys.ts     # React Query key factories
├── types.ts         # Feature-specific types
└── pages/           # Feature-specific pages (if any)
```

### Domain Layer
- Pure functions with no framework dependencies
- Business rules and calculations
- Testable in isolation
- No side effects

### Repository Layer
- Supabase data access only
- CRUD operations
- Query optimization
- Error handling

### Query Keys
- Centralized React Query key management
- Cache invalidation strategies
- Dependent query relationships

## Data Flow

### Order Flow
1. **User Interaction**: Page component captures user input
2. **Domain Logic**: Business rules validate and process data
3. **Repository**: Data persisted to Supabase
4. **React Query**: Cache updated and UI re-renders

### Query Flow
1. **Component**: Requests data using React Query
2. **Query Key**: Determines cache strategy
3. **Repository**: Fetches from Supabase
4. **Domain**: Processes raw data if needed
5. **Component**: Receives processed data

## Database Design

### Core Tables
- `restaurants` - Customer information
- `orders` - Customer orders
- `order_items` - Order line items
- `item_availability` - Stock management with icons
- `sales_invoices` - Customer billing (multi-order support)
- `purchase_plans` - Purchase planning
- `app_users` - System users
- `local_stores` - Local store management
- `stock_transfers` - Stock transfer tracking
- `warehouse_config` - Warehouse configuration
- `restaurant_portal_settings` - Restaurant portal config
- `purchase_stock_history` - Stock history tracking
- `audit_status_transitions` - Status change audit

### Relationships
- Restaurants → Orders (1:N)
- Orders → Order Items (1:N)
- Orders → Sales Invoices (1:1, but invoices can span multiple orders)
- Items → Item Availability (1:1)
- Local Stores → Stock Transfers (1:N)
- Restaurants → Restaurant Portal Settings (1:1)
- Purchase Plans → Purchase Stock History (1:N)

## Security Architecture

### Authentication
- Supabase Auth with email/password
- Session persistence in localStorage
- Automatic token refresh

### Authorization
- Role-based access control
- Row Level Security (RLS) policies
- Admin session management

### Data Protection
- Environment variables for secrets
- No sensitive data in frontend
- HTTPS enforced in production

## Performance Optimizations

### Frontend
- Code splitting with lazy loading
- React Query caching strategies
- Optimistic updates for better UX
- Image compression utilities

### Backend
- Database indexes on frequently queried columns
- Efficient SQL queries
- Connection pooling via Supabase
- Real-time subscriptions for live updates

## Testing Strategy

### Unit Tests
- Domain logic functions
- Utility functions
- React hooks

### Integration Tests
- Repository layer with Supabase
- Component interactions
- Route navigation

### E2E Tests
- Critical user workflows
- Cross-browser compatibility
- Mobile responsiveness

## Deployment Architecture

### Frontend
- Static assets served from CDN
- Progressive Web App capabilities
- Service worker for offline support

### Backend
- Supabase managed PostgreSQL
- Automatic scaling and backups
- Global CDN for API responses

## Monitoring and Observability

### Error Tracking
- Client-side error reporting
- Supabase error logging
- Performance metrics

### Analytics
- User interaction tracking
- Performance monitoring
- Business metrics dashboard

## Development Workflow

### Code Organization
- Feature-based development
- Consistent naming conventions
- TypeScript strict mode
- ESLint for code quality

### Version Control
- Git flow with feature branches
- Meaningful commit messages
- Code review process
- Automated testing on PRs

## Scalability Considerations

### Horizontal Scaling
- Stateless frontend architecture
- Database connection pooling
- CDN distribution

### Vertical Scaling
- Efficient React rendering
- Optimized database queries
- Memory management

## Enhanced Modules and Features

### Restaurant Portal Module
- **Self-service ordering** for restaurants
- **Order history** and tracking
- **Account management** and settings
- **Direct QR code access** without admin intervention

### Item Icon Management
- **Visual product catalog** with custom icons
- **Image upload and compression** optimization
- **Icon mapping** to product catalog
- **Responsive icon display** across all interfaces

### Local Store and Transfer System
- **Multi-location inventory** management
- **Stock transfer tracking** between locations
- **Central warehouse mode** support
- **Transfer audit trail** and approval workflows

### Advanced Purchase Planning
- **Demand aggregation** from multiple sources
- **Stock history tracking** and forecasting
- **Supplier management** integration
- **Purchase optimization** algorithms

### Multi-Order Invoicing
- **Consolidated billing** for multiple orders
- **Flexible invoice generation** options
- **Advanced payment tracking**
- **Revenue recognition** automation

### Audit and Compliance
- **Status transition audit** logging
- **User action tracking**
- **Compliance reporting**
- **Data integrity** validation

## Future Architecture Enhancements

### Microservices
- Service decomposition for specific domains
- API Gateway for request routing
- Service mesh for inter-service communication

### Advanced Caching
- Redis for session storage
- CDN caching strategies
- Database query caching

### Event-Driven Architecture
- Message queues for async processing
- Event sourcing for audit trails
- CQRS pattern for read/write separation
