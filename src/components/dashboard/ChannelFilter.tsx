import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export type Channel = "All Channels" | "Online" | "In-Store";

const OPTIONS: Channel[] = ["All Channels", "Online", "In-Store"];

export function ChannelFilter({
  value,
  onChange,
}: {
  value: Channel;
  onChange: (next: Channel) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 transition-colors"
        style={{
          height: 32,
          padding: "0 12px",
          borderRadius: 20,
          border: "1px solid #E5E2DB",
          backgroundColor: "#FFFFFF",
          fontSize: 13,
          fontWeight: 500,
          color: "#1A1A18",
        }}
      >
        <span>{value}</span>
        <ChevronDown size={14} strokeWidth={1.75} color="#6B6B6B" />
      </button>

      {open && (
        <div
          className="absolute end-0 z-50 mt-2 overflow-hidden"
          style={{
            minWidth: 160,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
          }}
        >
          {OPTIONS.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between transition-colors"
                style={{
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: selected ? "#EA580C" : "#1A1A18",
                  backgroundColor: selected ? "rgba(234, 88, 12, 0.08)" : "transparent",
                }}
              >
                <span>{opt}</span>
                {selected && <Check size={14} strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
