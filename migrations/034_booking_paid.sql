-- 034: paid/unpaid tracking on bookings.
-- paid_at: when payment was recorded (null = unpaid).
-- paid_method: freeform note of how they paid (card, cash, check, stripe, comp).
alter table public.bookings
  add column if not exists paid_at timestamptz,
  add column if not exists paid_method text;

comment on column public.bookings.paid_at is 'When payment was recorded. Null means unpaid.';
comment on column public.bookings.paid_method is 'How they paid: card, cash, check, stripe, comp, etc.';
