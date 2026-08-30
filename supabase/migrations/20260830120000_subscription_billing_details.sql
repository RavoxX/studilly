-- ============================================================================
-- Studilly 008: production-shaped subscription details
--
-- Mirrors the fields RevenueCat actually reports for a subscription, so the
-- subscription screen shows what really governs access rather than an
-- approximation, and so cancellation can keep the plan running until the
-- period genuinely ends.
-- ============================================================================

alter table subscriptions
  add column if not exists auto_renew boolean not null default true,
  add column if not exists gives_access boolean not null default false,
  add column if not exists management_url text,
  add column if not exists store text,
  add column if not exists product_id text,
  add column if not exists rc_subscription_id text;

comment on column subscriptions.auto_renew is
  'False after cancellation. The plan stays active until current_period_end.';
comment on column subscriptions.gives_access is
  'Mirrored from RevenueCat. Authoritative for whether the paid plan applies.';
