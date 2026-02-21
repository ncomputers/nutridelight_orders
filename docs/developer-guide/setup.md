# Developer Setup Guide

## Overview

This guide helps developers set up the Nutridelight Orders development environment and understand the enhanced codebase structure with new features like restaurant portal, item icons, and multi-location stock management.

## Prerequisites

### Required Software
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended IDE with extensions
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

### Optional Tools
- **Postman**: For API testing
- **DBeaver**: For database management
- **Supabase CLI**: For database operations
- **ImageMagick**: For image compression (item icons)

## Environment Setup

### 1. Clone Repository
```bash
git clone [repository-url]
cd nutridelight_orders
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 4. Required Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Admin Configuration
VITE_ADMIN_PASSWORD=your-admin-password

# Development Configuration
VITE_ADMIN_POLL_INTERVAL_MS=30000
```

### 5. Database Setup
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run database migrations
supabase db push

# Seed development data
supabase db seed
```

## Enhanced Project Structure

### Core Components
```
src/
├── components/
│   ├── ItemIcon.tsx           # Item icon display
│   ├── ItemIconUploader.tsx   # Icon upload with compression
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── TopTabs.tsx            # Top navigation tabs
│   └── ui/                    # shadcn/ui components
├── features/
│   ├── order/                 # Customer ordering
│   ├── sales/                 # Invoicing and payments
│   ├── admin/                 # Admin operations
│   ├── purchase/              # Purchase planning
│   └── restaurantPortal/      # NEW: Restaurant self-service
├── layouts/
│   ├── MainLayout.tsx         # Main application layout
│   └── ModuleLayout.tsx       # Feature-specific layout
└── lib/
    ├── imageCompression.ts    # NEW: Image processing
    └── navigation.ts          # Navigation utilities
```

### Feature Architecture
Each feature follows the clean architecture pattern:
```
features/[feature]/
├── domain/           # Pure business logic
├── repositories/     # Data access layer
├── queryKeys.ts     # React Query key factories
├── types.ts         # Feature-specific types
├── components/      # Feature components
└── pages/           # Feature-specific pages
```
VITE_ADMIN_POLL_INTERVAL_MS=15000
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## IDE Configuration

### VS Code Extensions
Install these extensions for optimal development experience:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### VS Code Settings
Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## Project Structure

### Directory Overview
```
nutridelight_orders/
├── public/                 # Static assets
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   ├── pages/            # Route-level components
│   ├── features/         # Feature-based modules
│   ├── lib/              # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── config/           # App configuration
│   ├── data/             # Static data
│   ├── integrations/     # External services
│   └── test/             # Test utilities
├── docs/                 # Documentation
├── supabase/             # Database migrations
└── tests/                # Test files
```

### Feature Structure
Each feature follows this pattern:
```
features/[feature]/
├── domain/           # Business logic
├── repositories/     # Data access
├── queryKeys.ts     # React Query keys
├── types.ts         # TypeScript types
└── pages/           # Feature pages
```

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add your feature description"
```

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

## Code Standards

### TypeScript Configuration
- Strict mode enabled
- No implicit any types
- Proper interface definitions
- Consistent naming conventions

### React Patterns
- Functional components with hooks
- Props interfaces for all components
- Custom hooks for complex logic
- Proper error boundaries

### CSS/Styling
- Tailwind CSS utility classes
- Component-specific styles when needed
- Responsive design principles
- Consistent spacing and colors

### File Naming
- Components: PascalCase (e.g., `OrderCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`)
- Types: camelCase (e.g., `orderTypes.ts`)

## Testing Guidelines

### Test Structure
```
src/
├── features/
│   └── [feature]/
│       └── domain/
│           └── [domain].test.ts
└── pages/
    └── routes.smoke.test.tsx
```

### Testing Types
- **Unit Tests**: Domain logic and utilities
- **Integration Tests**: Component interactions
- **Smoke Tests**: Route accessibility

### Test Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test orderDomain.test.ts

# Run tests with coverage
npm test -- --coverage
```

## Database Operations

### Supabase Setup
1. Create Supabase project
2. Run database migrations
3. Set up Row Level Security (RLS)
4. Configure authentication

### Local Development
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Run migrations
supabase db push
```

### Database Schema
- Tables defined in `supabase/migrations/`
- Types generated automatically
- RLS policies for security
- Indexes for performance

## Common Development Tasks

### Adding New Feature
1. Create feature directory structure
2. Define domain types and logic
3. Implement repository layer
4. Create React Query keys
5. Build UI components
6. Add tests
7. Update documentation

### Adding New API Endpoint
1. Create Supabase function or RPC
2. Update TypeScript types
3. Add repository method
4. Create React Query hook
5. Update error handling

### Adding New Component
1. Create component file
2. Define props interface
3. Implement component logic
4. Add tests if needed
5. Export from index file

### Updating Database Schema
1. Create new migration file
2. Write SQL changes
3. Update TypeScript types
4. Test migration locally
5. Deploy to staging

## Debugging

### Frontend Debugging
- Use browser DevTools
- React DevTools extension
- Network tab for API calls
- Console for error messages

### Backend Debugging
- Supabase logs
- Database query analysis
- RLS policy testing
- Performance monitoring

### Common Issues
- **Environment Variables**: Check .env file
- **Type Errors**: Verify TypeScript configuration
- **API Errors**: Check Supabase logs
- **Build Issues**: Clear node_modules and reinstall

## Performance Optimization

### Frontend Optimization
- Code splitting with lazy loading
- React Query caching strategies
- Image optimization
- Bundle size analysis

### Backend Optimization
- Database indexing
- Query optimization
- Connection pooling
- Caching strategies

### Monitoring
- Performance metrics
- Error tracking
- User analytics
- System health checks

## Deployment

### Build Process
```bash
# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview
```

### Environment Setup
- Staging environment for testing
- Production environment with proper security
- CI/CD pipeline setup
- Monitoring and logging

### Deployment Checklist
- Environment variables configured
- Database migrations applied
- Build tested successfully
- Performance optimized
- Security measures in place

## Contributing Guidelines

### Before Contributing
1. Read project documentation
2. Understand code architecture
3. Set up development environment
4. Review existing issues and PRs

### Making Contributions
1. Create issue for bug reports or feature requests
2. Fork repository and create feature branch
3. Follow coding standards and patterns
4. Add tests for new functionality
5. Update documentation
6. Submit pull request with clear description

### Code Review Process
- Automated tests must pass
- Code quality checks required
- Peer review for all changes
- Documentation updates needed
- Performance impact considered

## Troubleshooting

### Common Setup Issues

**Node.js Version Errors**
```bash
# Check Node.js version
node --version

# Use correct version with nvm
nvm use 18
```

**Dependency Installation**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Environment Variables**
```bash
# Verify .env file exists
ls -la .env*

# Check variable loading
echo $VITE_SUPABASE_URL
```

**Port Conflicts**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Use different port
npm run dev -- --port 3000
```

### Development Issues

**TypeScript Errors**
- Check tsconfig.json configuration
- Verify import paths
- Ensure proper type definitions
- Run TypeScript compiler directly

**React Query Issues**
- Verify query key structure
- Check cache invalidation
- Review error handling
- Test with React DevTools

**Styling Problems**
- Verify Tailwind configuration
- Check CSS import order
- Test responsive breakpoints
- Validate class names

## Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### Tools and Utilities
- [React Query DevTools](https://tanstack.com/query/latest/devtools)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [ESLint Plugin React](https://github.com/jsx-eslint/eslint-plugin-react)

### Community
- GitHub Issues and Discussions
- Stack Overflow for technical questions
- Discord/Slack communities
- Local meetups and conferences
