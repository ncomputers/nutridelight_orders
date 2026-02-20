# Architecture

## Layering

- `src/pages/*`: route containers and view composition.
- `src/features/*/repositories/*`: Supabase data access only.
- `src/features/*/domain/*`: pure business logic and calculations.
- `src/features/*/queryKeys.ts`: centralized React Query keys.
- `src/features/*/types.ts`: feature-level domain types.

## Current feature boundaries

- `features/order`
  - `domain/orderDomain.ts`: quantity and order-ref rules.
  - `repositories/orderRepository.ts`: restaurant, availability, order insert.
  - `queryKeys.ts`: order page query key factories.

- `features/sales`
  - `domain/salesDomain.ts`: invoice totals and payment-state math.
  - `repositories/salesRepository.ts`: delivered orders/invoices/invoice lines CRUD.
  - `queryKeys.ts`: sales query key factories.

- `features/admin`
  - `repositories/adminRepository.ts`: admin/purchase operational data reads/writes.
  - `queryKeys.ts`: admin query key factories.
  - `types.ts` + `utils.ts`: admin shared types and utility helpers.

- `features/purchase`
  - `domain/purchaseDomain.ts`: purchase aggregation, merge logic, totals, stock variance deltas.

## Rules for new code

- Do not call `supabase.from(...)` directly from page components.
- Add all new data fetch/mutation keys in `queryKeys.ts` for that feature.
- Put business rules in `domain/*` and keep them framework-free.
- Keep pages thin: orchestration only.

## Testing strategy

- Domain-first unit tests in each feature:
  - `features/order/domain/*.test.ts`
  - `features/sales/domain/*.test.ts`
  - `features/purchase/domain/*.test.ts`
- Route smoke tests in `src/pages/routes.smoke.test.tsx`.
- Existing page interaction tests remain for login/order link checks.
