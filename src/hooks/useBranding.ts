// Subscribe to the branding store and re-render on changes.
import { useEffect, useState } from "react";
import {
  getBranding,
  hexToRgb,
  subscribeBranding,
  type Branding,
} from "@/lib/brandingStore";

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(() => getBranding());

  useEffect(() => {
    setBranding(getBranding());
    return subscribeBranding(() => setBranding(getBranding()));
  }, []);

  return branding;
}

/** Build an `rgba(r, g, b, alpha)` string from a hex color, with fallback. */
export function accentRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(234, 88, 12, ${alpha})`;
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
