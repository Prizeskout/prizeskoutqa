// Tiny client-side store for client branding (PDF export header).
// Persists to localStorage and broadcasts changes to listeners in the app.

const STORAGE_KEY = "prizeskout.branding.v1";
const EVENT = "prizeskout:branding-updated";

export type Branding = {
  /** Hex string like "#EA580C". Empty string means "use default". */
  accentColor: string;
  /** data: URL of the uploaded logo (PNG/JPG/SVG), or "" for none. */
  logoDataUrl: string;
  /** Display name shown in the PDF header next to the logo. */
  brandName: string;
};

export const DEFAULT_BRANDING: Branding = {
  accentColor: "#EA580C",
  logoDataUrl: "",
  brandName: "PrizeSkout",
};

export function getBranding(): Branding {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw) as Partial<Branding>;
    return {
      accentColor: parsed.accentColor || DEFAULT_BRANDING.accentColor,
      logoDataUrl: parsed.logoDataUrl || "",
      brandName: parsed.brandName || DEFAULT_BRANDING.brandName,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function setBranding(next: Branding): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function resetBranding(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeBranding(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler); // sync across tabs
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Convert "#RRGGBB" → [r, g, b]. Returns null if not a valid 6-digit hex. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
