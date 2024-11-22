-- Step 1: Add shared_status column
alter table public.sales 
add column if not exists shared_status text check (shared_status in ('pending', 'accepted', 'rejected'));

-- Step 2: Add constraint to ensure shared_status is only set when shared_with is set
alter table public.sales 
add constraint shared_status_check check (
  (shared_with is null and shared_status is null) or
  (shared_with is not null and shared_status is not null)
);

-- Step 3: Create index for better query performance
create index if not exists idx_sales_shared_status on public.sales(shared_status);

-- Step 4: Update existing shared sales to have 'pending' status if not set
update public.sales
set shared_status = 'pending'
where shared_with is not null 
and shared_status is null;