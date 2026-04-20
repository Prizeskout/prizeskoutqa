// Tiny client-side store for the company profile (Account tab).
// Today only tracks company name, so Branding can default its brand name
// from it without users typing the same value twice.

const STORAGE_KEY = "prizeskout.company.v1";
const EVENT = "prizeskout:company-updated";

export type Company = {
  name: string;
};

export const DEFAULT_COMPANY: Company = {
  name: "Snoonu Qatar",
};

export function getCompany(): Company {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COMPANY;
    const parsed = JSON.parse(raw) as Partial<Company>;
    return { name: parsed.name || DEFAULT_COMPANY.name };
  } catch {
    return DEFAULT_COMPANY;
  }
}

export function setCompany(next: Company): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeCompany(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
