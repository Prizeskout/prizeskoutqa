import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("src/assets/landing/another-landing-page.html", "utf8");
const requiredArabic = [
  "اعرف ما يحققه كل طلب",
  "بنية ذكاء الربح",
  "ذكاء الربح الحقيقي",
  "ذكاء التسويات",
  "ذكاء العروض",
  "مساعد الربح بالذكاء الاصطناعي",
  "مصمم كبنية تحتية",
  "حماية الهامش",
  "مجموعات المطاعم",
  "ابدأ ببياناتك",
  "إجابات سريعة",
  "الربح هو الإشارة",
  "اسم الشركة",
  "البريد الإلكتروني للعمل",
  "تم استلام طلب التدقيق",
  "البلد والعملة",
  "التنقل الرئيسي",
];
for (const phrase of requiredArabic)
  assert(html.includes(phrase), `Landing localization is missing: ${phrase}`);
assert(html.includes("document.documentElement.lang=selected"));
assert(html.includes("document.documentElement.dir=selected==='ar'?'rtl':'ltr'"));
assert(html.includes("languageAttributes.forEach"));
assert(html.includes("qsa('[data-copy]')"));
assert(html.includes("qsa('[data-placeholder]')"));
assert(
  html.includes("languageTextNodes.forEach"),
  "Language switching must replace page copy, not only update its badge.",
);
console.log("Landing Arabic content, form, direction, and accessibility localization verified.");
