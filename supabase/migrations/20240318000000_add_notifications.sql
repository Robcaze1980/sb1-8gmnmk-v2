-- Add notifications table for shared sales
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  sale_id uuid references public.sales(id) on delete cascade not null,
  type text check (type in ('shared_sale_pending', 'shared_sale_accepted', 'shared_sale_rejected')) not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add index for faster notification queries
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);

-- Enable RLS on notifications
alter table public.notifications enable row level security;

-- Add notification policies
create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

-- Function to create notification
create or replace function create_shared_sale_notification()
returns trigger as $$
begin
  -- Get user_id from email
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

-- Trigger for shared sale notifications
create trigger on_shared_sale_created
  after insert or update of shared_with
  on public.sales
  for each row
  when (new.shared_with is not null and new.shared_status = 'pending')
  execute function create_shared_sale_notification();

-- Function to handle shared sale status changes
create or replace function handle_shared_sale_status_change()
returns trigger as $$
begin
  -- Create notification for status change
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

-- Trigger for shared sale status changes
create trigger on_shared_sale_status_change
  after update of shared_status
  on public.sales
  for each row
  when (new.shared_status != old.shared_status)
  execute function handle_shared_sale_status_change();