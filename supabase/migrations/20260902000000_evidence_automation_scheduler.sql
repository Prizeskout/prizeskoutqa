-- Production scheduling for API-independent evidence automation.
-- All jobs are secret-driven no-ops until their Vault URL and secret exist.

do $$
begin
  if exists(select 1 from pg_extension where extname = 'pg_cron')
     and exists(select 1 from pg_extension where extname = 'pg_net')
     and exists(select 1 from pg_namespace where nspname = 'vault') then
    if exists(select 1 from cron.job where jobname = 'evidence-process') then
      perform cron.unschedule('evidence-process');
    end if;
    perform cron.schedule('evidence-process', '*/5 * * * *', $job$
      select net.http_post(
        url := secrets.target_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || secrets.target_secret
        ),
        body := '{"limit":20}'::jsonb
      )
      from (
        select
          max(decrypted_secret) filter(where name = 'evidence_processor_url') as target_url,
          max(decrypted_secret) filter(where name = 'evidence_processor_secret') as target_secret
        from vault.decrypted_secrets
      ) secrets
      where nullif(secrets.target_url, '') is not null
        and nullif(secrets.target_secret, '') is not null;
    $job$);

    if exists(select 1 from cron.job where jobname = 'evidence-source-pull') then
      perform cron.unschedule('evidence-source-pull');
    end if;
    perform cron.schedule('evidence-source-pull', '7,22,37,52 * * * *', $job$
      select net.http_post(
        url := secrets.target_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || secrets.target_secret
        ),
        body := '{"limit":10}'::jsonb
      )
      from (
        select
          max(decrypted_secret) filter(where name = 'evidence_source_pull_url') as target_url,
          max(decrypted_secret) filter(where name = 'evidence_source_pull_secret') as target_secret
        from vault.decrypted_secrets
      ) secrets
      where nullif(secrets.target_url, '') is not null
        and nullif(secrets.target_secret, '') is not null;
    $job$);
  end if;
end $$;

comment on table public.ps_evidence_source_sync_runs is
  'Immutable source delivery history, including scheduled pull successes, partial deliveries and isolated failures.';
