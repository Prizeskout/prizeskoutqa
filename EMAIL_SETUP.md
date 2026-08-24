# Email: localization + delivery setup

App-sent email now renders in each user's chosen language (en / ar / fr, with
RTL for Arabic). This doc lists the config needed to make it actually send.

## What sends, and in which language

| Email | Trigger | Language source |
|-------|---------|-----------------|
| Welcome | Onboarding completes (`/api/register-code`, new code only) | `locale` in the request body (from current UI language), else account default, else `en` |
| Weekly margin digest | `weekly-margin-digest` cron, per subscriber | Saved account language (`profiles.preferred_locale`) |
| Alert (high-severity) | In-app notification created with severity `error` or `warning` | Saved account language (`profiles.preferred_locale`) |
| Sign-in / signup / reset / invite / email-change | Supabase Auth, via the Send Email Hook | `user_metadata.locale` hint (passed from sign-in UI), else saved account language, else `en` |

Product email (digest, alerts) also respects a master opt-out:
`user_notification_settings.pref_key = 'email_notifications'` (missing row = on).
Transactional email (welcome, auth links) ignores that switch.

## 1. Run the migration

```
supabase db push   # applies 20260851000000_email_locale_and_delivery.sql
```

Adds `profiles.preferred_locale` and seeds the `email_notifications` pref.

## 2. Environment variables

```
RESEND_API_KEY=re_xxx                      # Resend API key
EMAIL_FROM=PrizeSkout <noreply@yourdomain> # verified sender
APP_URL=https://app.yourdomain.com         # absolute base for links in emails
SEND_EMAIL_HOOK_SECRET=v1,whsec_xxx        # only for auth-email hook (step 4)
```

If `RESEND_API_KEY` / `EMAIL_FROM` are unset, sends are skipped and logged —
nothing throws, so the app keeps working without email configured.

## 3. Resend

1. Create a Resend account and verify your sending domain (DNS records).
2. Create an API key → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to an address on the verified domain.

## 4. Supabase Send Email Hook (auth emails only)

This makes the sign-in / signup / reset / invite emails localized. Without it,
those emails still send — but via Supabase's own single-language template.

1. Supabase dashboard → Authentication → Emails → **Send email hook** → Enable.
2. Hook type: **HTTPS**. URL: `https://app.yourdomain.com/api/public/hooks/auth-email`.
3. Copy the generated secret (`v1,whsec_...`) into `SEND_EMAIL_HOOK_SECRET`.
4. (Optional) To carry the pre-auth UI language into the first email, pass it
   when triggering sign-in, e.g.
   `supabase.auth.signInWithOtp({ email, options: { data: { locale } } })`.
   Otherwise the hook uses the saved account language, falling back to English.

The hook verifies the Standard Webhooks signature over the raw body, so only
Supabase can trigger a send.

## Notes / follow-ups

- Alert emails (`sendAlertEmail`) are automatically fired whenever `createNotification`
  inserts a notification with severity `error` or `warning`. The title and body come
  from the notification parameters; the email is rendered in the user's saved locale.
  The send respects the master email opt-out and is fully non-blocking.
- `email_change` uses the primary `token_hash`; if you enable secure email
  change (confirm on both addresses) revisit `buildVerifyUrl` for the second
  token.
- All `signInWithOtp` calls (access page, admin sign-in) now pass the UI locale
  via `data: { locale }` so the auth-email hook can render in the correct language
  even before the user has a saved account preference.
