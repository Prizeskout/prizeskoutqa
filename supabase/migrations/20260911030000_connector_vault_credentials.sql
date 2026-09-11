create or replace function public.ps_store_connector_credential(
  p_account_id text, p_connection_id uuid, p_secret jsonb
) returns uuid language plpgsql security definer set search_path=public,vault as $$
declare v_ref text; v_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if not exists(select 1 from public.ps_connector_connections where id=p_connection_id and account_id=p_account_id) then raise exception 'connector connection not found'; end if;
  if jsonb_typeof(p_secret)<>'object' then raise exception 'credential must be an object'; end if;
  select credential_reference into v_ref from public.ps_connector_connections where id=p_connection_id and account_id=p_account_id for update;
  if v_ref ~ '^vault://[0-9a-f-]{36}$' then
    v_id=substring(v_ref from 9)::uuid;
    perform vault.update_secret(v_id,p_secret::text,null,'PrizeSkout connector credential');
  else
    select vault.create_secret(p_secret::text,null,'PrizeSkout connector credential') into v_id;
  end if;
  update public.ps_connector_connections set credential_reference='vault://'||v_id::text,updated_at=now() where id=p_connection_id and account_id=p_account_id;
  return v_id;
end $$;

create or replace function public.ps_read_connector_credential(p_account_id text,p_connection_id uuid)
returns jsonb language plpgsql security definer set search_path=public,vault as $$
declare v_ref text; v_secret text;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  select credential_reference into v_ref from public.ps_connector_connections where id=p_connection_id and account_id=p_account_id;
  if v_ref is null or v_ref !~ '^vault://[0-9a-f-]{36}$' then raise exception 'connector credential not configured'; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where id=substring(v_ref from 9)::uuid;
  if v_secret is null then raise exception 'connector credential not found'; end if;
  return v_secret::jsonb;
end $$;

revoke all on function public.ps_store_connector_credential(text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.ps_read_connector_credential(text,uuid) from public,anon,authenticated;
grant execute on function public.ps_store_connector_credential(text,uuid,jsonb) to service_role;
grant execute on function public.ps_read_connector_credential(text,uuid) to service_role;

comment on function public.ps_store_connector_credential(text,uuid,jsonb) is 'Encrypts connector credentials in Supabase Vault and stores only the opaque Vault reference on the tenant connection.';
