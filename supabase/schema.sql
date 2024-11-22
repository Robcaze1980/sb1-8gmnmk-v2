-- Create storage bucket for spiff images
insert into storage.buckets (id, name, public) 
values ('sales-documents', 'sales-documents', true);

-- Create function to handle updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on users table
alter table public.users enable row level security;

-- Create users trigger for updated_at
create trigger handle_users_updated_at
  before update on public.users
  for each row
  execute function handle_updated_at();

-- Create users policy
create policy "Users can view their own data"
  on public.users
  for select
  using (auth.uid() = id);

-- Create sales table
create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  stock_number text not null,
  customer_name text not null,
  sale_type text check (sale_type in ('New', 'Used', 'Trade-In')) not null,
  sale_price numeric(10,2) not null check (sale_price >= 0),
  accessories_price numeric(10,2) check (accessories_price >= 0),
  warranty_price numeric(10,2) check (warranty_price >= 0),
  warranty_cost numeric(10,2) check (warranty_cost >= 0),
  maintenance_price numeric(10,2) check (maintenance_price >= 0),
  maintenance_cost numeric(10,2) check (maintenance_cost >= 0),
  shared_with text references public.users(email),
  shared_status text check (shared_status in ('pending', 'accepted', 'rejected')),
  trade_in_commission numeric(10,2) check (trade_in_commission >= 0),
  spiff_amount numeric(10,2) check (spiff_amount >= 0),
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

-- Enable RLS on sales table
alter table public.sales enable row level security;

-- Create sales trigger for updated_at
create trigger handle_sales_updated_at
  before update on public.sales
  for each row
  execute function handle_updated_at();

-- Create notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  sale_id uuid references public.sales(id) on delete cascade not null,
  type text check (type in ('shared_sale_pending', 'shared_sale_accepted', 'shared_sale_rejected')) not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on notifications table
alter table public.notifications enable row level security;

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

-- Create functions
create or replace function check_stock_number_availability(
  p_stock_number text,
  p_user_id uuid
)
returns table (
  is_available boolean,
  claimed_by text,
  customer_name text,
  sale_date date
) as $$
begin
  return query
  select 
    case 
      when s.id is null then true
      when s.user_id = p_user_id then true
      else false
    end as is_available,
    u.email as claimed_by,
    s.customer_name,
    s.date as sale_date
  from public.sales s
  left join public.users u on u.id = s.user_id
  where s.stock_number = p_stock_number
  and s.shared_with is null
  limit 1;
end;
$$ language plpgsql security definer;

create or replace function create_shared_sale_notification()
returns trigger as $$
begin
  insert into public.notifications (user_id, sale_id, type)
  select 
    u.id,
    new.id,
    'shared_sale_pending'
  from public.users u
  where u.email = new.shared_with;
  
  return new;
end;
$$ language plpgsql security definer;

create or replace function handle_shared_sale_status_change()
returns trigger as $$
begin
  if new.shared_status in ('accepted', 'rejected') then
    insert into public.notifications (user_id, sale_id, type)
    select 
      s.user_id,
      s.id,
      'shared_sale_' || new.shared_status
    from public.sales s
    where s.id = new.id;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create triggers
create trigger on_shared_sale_created
  after insert or update of shared_with
  on public.sales
  for each row
  when (new.shared_with is not null and new.shared_status = 'pending')
  execute function create_shared_sale_notification();

create trigger on_shared_sale_status_change
  after update of shared_status
  on public.sales
  for each row
  when (new.shared_status != old.shared_status)
  execute function handle_shared_sale_status_change();

-- Create RLS policies
create policy "Users can view their own sales and sales shared with them"
  on public.sales
  for select
  using (
    auth.uid() = user_id 
    or auth.email() = shared_with
  );

create policy "Users can insert their own sales"
  on public.sales
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sales"
  on public.sales
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sales"
  on public.sales
  for delete
  using (auth.uid() = user_id);

create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

-- Storage policies
create policy "Anyone can view sales documents"
  on storage.objects
  for select
  using (bucket_id = 'sales-documents');

create policy "Authenticated users can upload sales documents"
  on storage.objects
  for insert
  with check (
    bucket_id = 'sales-documents' 
    and auth.role() = 'authenticated'
  );