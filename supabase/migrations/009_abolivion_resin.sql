-- Resina: moeda da Loja da Tribo (distinta de currency/moedas)
alter table public.abolivion_profiles
  add column if not exists resin integer not null default 0;

comment on column public.abolivion_profiles.resin is 'Resina — moeda da Loja da Tribo (Abolivion 0.1.8+)';
