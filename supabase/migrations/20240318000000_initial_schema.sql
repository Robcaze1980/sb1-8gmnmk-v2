-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sales table
create table if not exists public.sales (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  stock_number text not null,
  customer_name text not null,
  sale_type text check (sale_type in ('New', 'Used', 'Trade-In')) not null,
  sale_price numeric(10,2) not null check (sale_price >= 0),
  accessories_price numeric(10,2) default 0 check (accessories_price >= 0),
  warranty_price numeric(10,2) default 0 check (warranty_price >= 0),
  warranty_cost numeric(10,2) default 0 check (warranty_cost >= 0),
  maintenance_price numeric(10,2) default 0 check (maintenance_price >= 0),
  maintenance_cost numeric(10,2) default 0 check (maintenance_cost >= 0),
  shared_with text references public.users(email),
  shared_status text check (shared_status in ('pending', 'accepted', 'rejected')),
  trade_in_commission numeric(10,2) default 0 check (trade_in_commission >= 0),
  spiff_amount numeric(10,2) default 0 check (spiff_amount >= 0),
  spiff_note text,
  spiff_image_url text,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint shared_status_check check (
    (shared_with is null and shared_status is null) or
    (shared_with is not null and shared_status is not null)
  )
);

-- Create notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  sale_id uuid references public.sales(id) on delete cascade not null,
  type text check (type in ('shared_sale_pending', 'shared_sale_accepted', 'shared_sale_rejected')) not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create unique index if not exists unique_stock_number_unless_shared
  on public.sales (stock_number)
  where shared_with is null;

create index if not exists idx_sales_user_id on public.sales(user_id);
create index if not exists idx_sales_shared_with on public.sales(shared_with);
create index if not exists idx_sales_stock_number on public.sales(stock_number);
create index if not exists idx_sales_date on public.sales(date);
create index if not exists idx_sales_shared_status on public.sales(shared_status);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);

-- Create updated_at function
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers
create trigger handle_users_updated_at
  before update on public.users
  for each row
  execute function handle_updated_at();

create trigger handle_sales_updated_at
  before update on public.sales
  for each row
  execute function handle_updated_at();

-- Create notification functions
create or replace function create_shared_sale_notification()
returns trigger as $$
begin
  if new.shared_with is not null and new.shared_status = 'pending' then
    insert into public.notifications (user_id, sale_id, type)
    select 
      u.id,
      new.id,
      'shared_sale_pending'
    from public.users u
    where u.email = new.shared_with;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function handle_shared_sale_status_change()
returns trigger as $$
begin
  if new.shared_status in ('accepted', 'rejected') and 
     (old.shared_status is null or new.shared_status != old.shared_status) then
    insert into public.notifications (user_id, sale_id, type)
    values (
      new.user_id,
      new.id,
      'shared_sale_' || new.shared_status
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create notification triggers
create trigger on_shared_sale_created
  after insert or update of shared_with
  on public.sales
  for each row
  execute function create_shared_sale_notification();

create trigger on_shared_sale_status_change
  after update of shared_status
  on public.sales
  for each row
  execute function handle_shared_sale_status_change();

-- Enable RLS
alter table public.users enable row level security;
alter table public.sales enable row level security;
alter table public.notifications enable row level security;

-- Create RLS policies
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can view their own sales and sales shared with them"
  on public.sales for select
  using (auth.uid() = user_id or auth.email() = shared_with);

create policy "Users can insert their own sales"
  on public.sales for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sales"
  on public.sales for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sales"
  on public.sales for delete
  using (auth.uid() = user_id);

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Create storage bucket
insert into storage.buckets (id, name, public)
values ('sales-documents', 'sales-documents', true)
on conflict (id) do nothing;

-- Create storage policies
create policy "Anyone can view sales documents"
  on storage.objects for select
  using (bucket_id = 'sales-documents');

create policy "Authenticated users can upload sales documents"
  on storage.objects for insert
  with check (
    bucket_id = 'sales-documents' 
    and auth.role() = 'authenticated'
  );