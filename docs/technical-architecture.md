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
├── pages/              # Route-level components
├── features/           # Feature-based modules
│   ├── order/         # Customer ordering
│   ├── sales/         # Invoicing and sales
│   ├── admin/         # Admin operations
│   └── purchase/      # Purchase planning
├── lib/               # Utility functions
├── hooks/             # Custom React hooks
├── config/            # Application configuration
├── data/              # Static data and catalogs
├── integrations/      # External service integrations
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
- `item_availability` - Stock management
- `sales_invoices` - Customer billing
- `purchase_plans` - Purchase planning
- `app_users` - System users

### Relationships
- Restaurants → Orders (1:N)
- Orders → Order Items (1:N)
- Orders → Sales Invoices (1:N)
- Items → Item Availability (1:1)

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
