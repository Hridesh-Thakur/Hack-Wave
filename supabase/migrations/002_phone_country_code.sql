-- ReWear AI migration: store the international calling code separately.
-- Safe to run on an existing project; it does not delete existing data.
alter table public.profiles
  add column if not exists phone_country_code text not null default '+91';

-- Update the signup trigger so new accounts save full name, country code,
-- local phone number, and a non-privileged role to their profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone_country_code, phone_number, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_country_code', '+91'),
    coalesce(new.raw_user_meta_data ->> 'phone_number', ''),
    case when new.raw_user_meta_data ->> 'role' = 'shipper' then 'shipper' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Recreate trigger to ensure it points at the latest function.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
