-- Beta cleanup: remove accounting + POS/FIFO experimental schema

-- POS/FIFO cleanup
DROP TABLE IF EXISTS public.stock_mapping CASCADE;
DROP TABLE IF EXISTS public.sales_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.purchase_items CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relname = 'products'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_product_sku_if_missing ON public.products';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.set_product_sku_if_missing();
DROP SEQUENCE IF EXISTS public.products_sku_seq;

-- Accounting cleanup
DROP TABLE IF EXISTS public.journal_lines CASCADE;
DROP TABLE IF EXISTS public.journal_vouchers CASCADE;
DROP TABLE IF EXISTS public.ledger_opening_balances CASCADE;
DROP TABLE IF EXISTS public.purchase_user_ledger_map CASCADE;
DROP TABLE IF EXISTS public.account_ledgers CASCADE;
DROP TABLE IF EXISTS public.accounts_day_closures CASCADE;
DROP TABLE IF EXISTS public.cash_transactions CASCADE;
DROP TABLE IF EXISTS public.daily_settlements CASCADE;
