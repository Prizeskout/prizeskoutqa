-- Activate the recovery cron using the already-provisioned internal processor credential.
do $$
declare v_secret text;
begin
  if not exists(select 1 from pg_namespace where nspname='vault') then return; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='evidence_processor_secret' limit 1;
  if nullif(v_secret,'') is null then
    raise exception 'evidence_processor_secret must exist before engine recovery can be activated';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='engine_processor_secret') then
    perform vault.create_secret(v_secret,'engine_processor_secret','Bearer credential for the PrizeSkout engine recovery hook');
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='engine_processor_url') then
    perform vault.create_secret('https://prizeskout.qa/api/public/hooks/engine','engine_processor_url','PrizeSkout engine recovery hook URL');
  end if;
end $$;
