// Localized email copy for en / ar / fr.
//
// Keep keys identical across locales. Placeholders use {token} and are filled
// by fill() in templates.ts. UI strings live in src/locales/*.json; email copy
// is intentionally separate because the tone, length and calls-to-action of
// transactional mail differ from in-app labels.
import type { EmailLocale } from "./locale";

export type EmailStrings = {
  brand: string;
  layout: {
    // Shown faintly in the footer of every email.
    footerTagline: string;
    autoNote: string;
    rights: string;
    fallbackLead: string; // "Button not working? Paste this link:"
  };
  welcome: {
    subject: string;
    preview: string;
    heading: string; // {store}
    intro: string;
    b1: string;
    b2: string;
    b3: string;
    cta: string;
    help: string;
  };
  digest: {
    subject: string;
    preview: string;
    heading: string;
    line: string; // {checked} {breaches} {repriced}
    allGood: string;
    someBreaches: string; // {breaches}
    cta: string;
    manage: string;
  };
  alert: {
    subjectPrefix: string; // "PrizeSkout alert: "
    preview: string;
    cta: string;
    manage: string;
  };
  auth: {
    button: string;
    fallbackNote: string;
    ignoreNote: string;
    expiry: string;
    magiclink: { subject: string; heading: string; intro: string };
    signup: { subject: string; heading: string; intro: string };
    recovery: { subject: string; heading: string; intro: string };
    invite: { subject: string; heading: string; intro: string };
    email_change: { subject: string; heading: string; intro: string };
  };
};

const en: EmailStrings = {
  brand: "PrizeSkout",
  layout: {
    footerTagline: "Automated margin protection for MENA marketplaces.",
    autoNote: "This is an automated message from PrizeSkout.",
    rights: "All rights reserved.",
    fallbackLead: "If the button doesn't work, copy and paste this link into your browser:",
  },
  welcome: {
    subject: "Welcome to PrizeSkout",
    preview: "Your dashboard is ready — start protecting your margins.",
    heading: "Welcome aboard, {store}",
    intro: "Your PrizeSkout account is ready. From here on we watch your delivery-app prices and margins so you don't have to.",
    b1: "See every channel's live price and margin in one place.",
    b2: "Get alerted the moment a price drops below your target margin.",
    b3: "Let PrizeSkout reprice automatically within the rules you set.",
    cta: "Open your dashboard",
    help: "Questions? Just reply to this email — a real person will read it.",
  },
  digest: {
    subject: "Your weekly margin summary",
    preview: "Here's how your prices and margins moved this week.",
    heading: "Your week at a glance",
    line: "{checked} products checked · {breaches} below your target · {repriced} prices changed.",
    allGood: "Every product stayed at or above your target margin this week. Nice.",
    someBreaches: "{breaches} product(s) dipped below your target margin — worth a look.",
    cta: "View the details",
    manage: "Manage which emails you receive",
  },
  alert: {
    subjectPrefix: "PrizeSkout alert: ",
    preview: "Something on your account needs attention.",
    cta: "Open PrizeSkout",
    manage: "Manage which emails you receive",
  },
  auth: {
    button: "Confirm and continue",
    fallbackNote: "If the button doesn't work, copy and paste this link into your browser:",
    ignoreNote: "If you didn't request this, you can safely ignore this email.",
    expiry: "For your security, this link expires shortly.",
    magiclink: {
      subject: "Your PrizeSkout sign-in link",
      heading: "Sign in to PrizeSkout",
      intro: "Click the button below to sign in to your dashboard. No password needed.",
    },
    signup: {
      subject: "Confirm your PrizeSkout email",
      heading: "Confirm your email",
      intro: "Confirm this email address to activate your PrizeSkout account.",
    },
    recovery: {
      subject: "Reset your PrizeSkout password",
      heading: "Reset your password",
      intro: "Click below to choose a new password for your PrizeSkout account.",
    },
    invite: {
      subject: "You're invited to PrizeSkout",
      heading: "You've been invited",
      intro: "You've been invited to join a team on PrizeSkout. Click below to accept and set up your access.",
    },
    email_change: {
      subject: "Confirm your new email",
      heading: "Confirm your new email",
      intro: "Confirm this address to finish changing the email on your PrizeSkout account.",
    },
  },
};

const ar: EmailStrings = {
  brand: "PrizeSkout",
  layout: {
    footerTagline: "حماية آلية للهوامش في أسواق منطقة الشرق الأوسط وشمال إفريقيا.",
    autoNote: "هذه رسالة آلية من PrizeSkout.",
    rights: "جميع الحقوق محفوظة.",
    fallbackLead: "إذا لم يعمل الزر، انسخ هذا الرابط والصقه في المتصفح:",
  },
  welcome: {
    subject: "مرحبًا بك في PrizeSkout",
    preview: "لوحة التحكم جاهزة — ابدأ بحماية هوامشك.",
    heading: "أهلًا بك، {store}",
    intro: "أصبح حسابك في PrizeSkout جاهزًا. من الآن سنراقب أسعار وهوامش تطبيقات التوصيل نيابةً عنك.",
    b1: "شاهد السعر والهامش الحي لكل قناة في مكان واحد.",
    b2: "احصل على تنبيه فور انخفاض السعر تحت الهامش المستهدف.",
    b3: "دع PrizeSkout يعيد التسعير تلقائيًا ضمن القواعد التي تحددها.",
    cta: "افتح لوحة التحكم",
    help: "لديك سؤال؟ فقط رُد على هذه الرسالة — سيقرأها شخص حقيقي.",
  },
  digest: {
    subject: "ملخص هوامشك الأسبوعي",
    preview: "إليك كيف تغيرت أسعارك وهوامشك هذا الأسبوع.",
    heading: "أسبوعك في لمحة",
    line: "تم فحص {checked} منتجًا · {breaches} تحت هدفك · {repriced} سعرًا تغيّر.",
    allGood: "بقيت كل المنتجات عند الهامش المستهدف أو أعلى منه هذا الأسبوع. رائع.",
    someBreaches: "انخفض {breaches} من المنتجات تحت الهامش المستهدف — يستحق النظر.",
    cta: "عرض التفاصيل",
    manage: "إدارة الرسائل التي تصلك",
  },
  alert: {
    subjectPrefix: "تنبيه PrizeSkout: ",
    preview: "هناك أمر في حسابك يحتاج انتباهك.",
    cta: "افتح PrizeSkout",
    manage: "إدارة الرسائل التي تصلك",
  },
  auth: {
    button: "التأكيد والمتابعة",
    fallbackNote: "إذا لم يعمل الزر، انسخ هذا الرابط والصقه في المتصفح:",
    ignoreNote: "إذا لم تطلب هذا، يمكنك تجاهل هذه الرسالة بأمان.",
    expiry: "لأمانك، تنتهي صلاحية هذا الرابط قريبًا.",
    magiclink: {
      subject: "رابط الدخول إلى PrizeSkout",
      heading: "تسجيل الدخول إلى PrizeSkout",
      intro: "اضغط الزر أدناه لتسجيل الدخول إلى لوحة التحكم. لا حاجة لكلمة مرور.",
    },
    signup: {
      subject: "تأكيد بريدك في PrizeSkout",
      heading: "تأكيد بريدك الإلكتروني",
      intro: "أكّد عنوان بريدك هذا لتفعيل حسابك في PrizeSkout.",
    },
    recovery: {
      subject: "إعادة تعيين كلمة مرور PrizeSkout",
      heading: "إعادة تعيين كلمة المرور",
      intro: "اضغط أدناه لاختيار كلمة مرور جديدة لحسابك في PrizeSkout.",
    },
    invite: {
      subject: "دعوة للانضمام إلى PrizeSkout",
      heading: "لقد تمت دعوتك",
      intro: "تمت دعوتك للانضمام إلى فريق على PrizeSkout. اضغط أدناه للقبول وإعداد وصولك.",
    },
    email_change: {
      subject: "تأكيد بريدك الجديد",
      heading: "تأكيد بريدك الجديد",
      intro: "أكّد هذا العنوان لإتمام تغيير البريد على حسابك في PrizeSkout.",
    },
  },
};

const fr: EmailStrings = {
  brand: "PrizeSkout",
  layout: {
    footerTagline: "Protection automatisée des marges pour les marketplaces MENA.",
    autoNote: "Ceci est un message automatique de PrizeSkout.",
    rights: "Tous droits réservés.",
    fallbackLead: "Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :",
  },
  welcome: {
    subject: "Bienvenue chez PrizeSkout",
    preview: "Votre tableau de bord est prêt — protégez vos marges dès maintenant.",
    heading: "Bienvenue, {store}",
    intro: "Votre compte PrizeSkout est prêt. Désormais, nous surveillons vos prix et marges sur les applications de livraison à votre place.",
    b1: "Voyez le prix et la marge en direct de chaque canal au même endroit.",
    b2: "Soyez alerté dès qu'un prix passe sous votre marge cible.",
    b3: "Laissez PrizeSkout réajuster les prix automatiquement selon vos règles.",
    cta: "Ouvrir le tableau de bord",
    help: "Une question ? Répondez simplement à cet e-mail — une vraie personne le lira.",
  },
  digest: {
    subject: "Votre résumé de marge hebdomadaire",
    preview: "Voici l'évolution de vos prix et marges cette semaine.",
    heading: "Votre semaine en un coup d'œil",
    line: "{checked} produits vérifiés · {breaches} sous votre cible · {repriced} prix modifiés.",
    allGood: "Tous vos produits sont restés au niveau de votre marge cible ou au-dessus cette semaine. Bravo.",
    someBreaches: "{breaches} produit(s) sont passés sous votre marge cible — à surveiller.",
    cta: "Voir les détails",
    manage: "Gérer les e-mails que vous recevez",
  },
  alert: {
    subjectPrefix: "Alerte PrizeSkout : ",
    preview: "Un élément de votre compte requiert votre attention.",
    cta: "Ouvrir PrizeSkout",
    manage: "Gérer les e-mails que vous recevez",
  },
  auth: {
    button: "Confirmer et continuer",
    fallbackNote: "Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :",
    ignoreNote: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    expiry: "Pour votre sécurité, ce lien expire prochainement.",
    magiclink: {
      subject: "Votre lien de connexion PrizeSkout",
      heading: "Connexion à PrizeSkout",
      intro: "Cliquez sur le bouton ci-dessous pour accéder à votre tableau de bord. Aucun mot de passe requis.",
    },
    signup: {
      subject: "Confirmez votre e-mail PrizeSkout",
      heading: "Confirmez votre e-mail",
      intro: "Confirmez cette adresse e-mail pour activer votre compte PrizeSkout.",
    },
    recovery: {
      subject: "Réinitialisez votre mot de passe PrizeSkout",
      heading: "Réinitialiser le mot de passe",
      intro: "Cliquez ci-dessous pour choisir un nouveau mot de passe pour votre compte PrizeSkout.",
    },
    invite: {
      subject: "Vous êtes invité sur PrizeSkout",
      heading: "Vous avez été invité",
      intro: "Vous êtes invité à rejoindre une équipe sur PrizeSkout. Cliquez ci-dessous pour accepter et configurer votre accès.",
    },
    email_change: {
      subject: "Confirmez votre nouvel e-mail",
      heading: "Confirmez votre nouvel e-mail",
      intro: "Confirmez cette adresse pour finaliser le changement d'e-mail de votre compte PrizeSkout.",
    },
  },
};

const STRINGS: Record<EmailLocale, EmailStrings> = { en, ar, fr };

export function strings(locale: EmailLocale): EmailStrings {
  return STRINGS[locale] ?? en;
}

/** Replace {token} placeholders with values. Missing tokens are left as-is. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
