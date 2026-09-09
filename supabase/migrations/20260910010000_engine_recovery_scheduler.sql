-- Low-frequency recovery sweep. Normal work starts from request waitUntil;
-- this only recovers interrupted leases and scheduled retries.
do $$
begin
  if exists(select 1 from pg_extension where extname='pg_cron')
     and exists(select 1 from pg_extension where extname='pg_net')
     and exists(select 1 from pg_namespace where nspname='vault') then
    if exists(select 1 from cron.job where jobname='prizeskout-engine-recovery') then
      perform cron.unschedule('prizeskout-engine-recovery');
    end if;
    perform cron.schedule('prizeskout-engine-recovery','3,13,23,33,43,53 * * * *',$job$
      select net.http_post(
        url:=secrets.target_url,
        headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secrets.target_secret),
        body:='{"limit":10}'::jsonb,
        timeout_milliseconds:=15000
      )
      from (
        select max(decrypted_secret) filter(where name='engine_processor_url') target_url,
               max(decrypted_secret) filter(where name='engine_processor_secret') target_secret
        from vault.decrypted_secrets
      ) secrets
      where nullif(secrets.target_url,'') is not null and nullif(secrets.target_secret,'') is not null;
    $job$);
  end if;
end $$;
