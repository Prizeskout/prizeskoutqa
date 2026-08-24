// Concrete email templates. Each returns { subject, html, text } for a locale.
// Copy lives in strings.ts; layout in render.ts. These functions only assemble.
import type { EmailLocale } from "./locale";
import { strings, fill } from "./strings";
import { renderEmail } from "./render";

export type RenderedEmail = { subject: string; html: string; text: string };

export function welcomeEmail(
  data: { store?: string; dashboardUrl: string },
  locale: EmailLocale,
): RenderedEmail {
  const s = strings(locale);
  const store = data.store?.trim() || strings(locale).brand;
  const { html, text } = renderEmail({
    locale,
    previewText: s.welcome.preview,
    heading: fill(s.welcome.heading, { store }),
    bodyLines: [s.welcome.intro, `• ${s.welcome.b1}`, `• ${s.welcome.b2}`, `• ${s.welcome.b3}`, s.welcome.help],
    cta: { label: s.welcome.cta, url: data.dashboardUrl },
  });
  return { subject: s.welcome.subject, html, text };
}

export function weeklyDigestEmail(
  data: { checked: number; breaches: number; repriced: number; url: string; manageUrl: string },
  locale: EmailLocale,
): RenderedEmail {
  const s = strings(locale);
  const summary =
    data.breaches > 0
      ? fill(s.digest.someBreaches, { breaches: data.breaches })
      : s.digest.allGood;
  const { html, text } = renderEmail({
    locale,
    previewText: s.digest.preview,
    heading: s.digest.heading,
    bodyLines: [
      fill(s.digest.line, { checked: data.checked, breaches: data.breaches, repriced: data.repriced }),
      summary,
    ],
    cta: { label: s.digest.cta, url: data.url },
    footerLink: { label: s.digest.manage, url: data.manageUrl },
  });
  return { subject: s.digest.subject, html, text };
}

export function alertEmail(
  data: { title: string; body?: string; url: string; manageUrl: string },
  locale: EmailLocale,
): RenderedEmail {
  const s = strings(locale);
  const { html, text } = renderEmail({
    locale,
    previewText: s.alert.preview,
    heading: data.title,
    bodyLines: data.body ? [data.body] : [],
    cta: { label: s.alert.cta, url: data.url },
    footerLink: { label: s.alert.manage, url: data.manageUrl },
  });
  return { subject: `${s.alert.subjectPrefix}${data.title}`, html, text };
}

export type AuthEmailType = "magiclink" | "signup" | "recovery" | "invite" | "email_change";

export function authEmail(
  data: { type: AuthEmailType; actionUrl: string },
  locale: EmailLocale,
): RenderedEmail {
  const s = strings(locale);
  const copy = s.auth[data.type];
  const { html, text } = renderEmail({
    locale,
    previewText: copy.intro,
    heading: copy.heading,
    bodyLines: [copy.intro, s.auth.expiry, s.auth.ignoreNote],
    cta: { label: s.auth.button, url: data.actionUrl },
  });
  return { subject: copy.subject, html, text };
}
