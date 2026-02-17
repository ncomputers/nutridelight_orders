ALTER TABLE public.journal_vouchers
  ADD COLUMN IF NOT EXISTS reversal_of_voucher_id UUID REFERENCES public.journal_vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_role TEXT;

ALTER TABLE public.journal_vouchers
  DROP CONSTRAINT IF EXISTS journal_vouchers_actor_role_check;

ALTER TABLE public.journal_vouchers
  ADD CONSTRAINT journal_vouchers_actor_role_check
  CHECK (actor_role IS NULL OR actor_role IN ('admin', 'purchase', 'sales'));

CREATE INDEX IF NOT EXISTS idx_journal_vouchers_date_type_reversed
  ON public.journal_vouchers (voucher_date, voucher_type, is_reversed);

CREATE INDEX IF NOT EXISTS idx_accounts_day_closures_date_closed
  ON public.accounts_day_closures (closure_date, is_closed);

CREATE OR REPLACE FUNCTION public.assert_journal_voucher_balanced(voucher_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  dr_sum NUMERIC := 0;
  cr_sum NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(dr_amount), 0), COALESCE(SUM(cr_amount), 0)
    INTO dr_sum, cr_sum
  FROM public.journal_lines
  WHERE voucher_id = voucher_uuid;

  IF dr_sum <= 0 OR cr_sum <= 0 OR dr_sum <> cr_sum THEN
    RAISE EXCEPTION 'Journal voucher % is unbalanced (Dr %, Cr %)', voucher_uuid, dr_sum, cr_sum;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_journal_voucher_balanced_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assert_journal_voucher_balanced(COALESCE(NEW.voucher_id, OLD.voucher_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_journal_voucher_balanced_on_lines ON public.journal_lines;
CREATE CONSTRAINT TRIGGER trg_assert_journal_voucher_balanced_on_lines
AFTER INSERT OR UPDATE OR DELETE
ON public.journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.assert_journal_voucher_balanced_trigger();
