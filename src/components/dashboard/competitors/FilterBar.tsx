import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import type { Category, ChannelOpt, SortKey } from "./types";

const CATEGORIES: Category[] = ["All", "Electronics", "Grocery", "Fashion", "Home", "Beauty"];
const CHANNEL_OPTS: ChannelOpt[] = ["All Channels", "Online", "In-Store"];
const SORT_OPTS: SortKey[] = ["Price gap", "Your price", "Category", "Signal"];

function PillDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 20,
          border: "1px solid #E5E2DB",
          backgroundColor: "#FFFFFF",
          fontSize: 12,
          fontWeight: 500,
          color: "#1A1A18",
          cursor: "pointer",
        }}
      >
        <span>{label ? `${label} ${value}` : value}</span>
        <ChevronDown size={14} strokeWidth={1.75} color="#6B6B6B" />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 170,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            overflow: "hidden",
            zIndex: 30,
          }}
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: selected ? "#EA580C" : "#1A1A18",
                  backgroundColor: selected ? "rgba(234, 88, 12, 0.08)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
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

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const bg = active ? "#EA580C" : "#FFFFFF";
  const color = active ? "#FFFFFF" : hover ? "#EA580C" : "#6B6B6B";
  const border = active || hover ? "#EA580C" : "#E5E2DB";
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "6px 16px",
        borderRadius: 20,
        border: `1px solid ${border}`,
        backgroundColor: bg,
        color,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export function FilterBar({
  category,
  setCategory,
  channel,
  setChannel,
  sort,
  setSort,
  search,
  setSearch,
}: {
  category: Category;
  setCategory: (c: Category) => void;
  channel: ChannelOpt;
  setChannel: (c: ChannelOpt) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => (
          <CategoryPill
            key={c}
            label={c}
            active={category === c}
            onClick={() => setCategory(c)}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <PillDropdown value={channel} options={CHANNEL_OPTS} onChange={setChannel} />
        <PillDropdown label="Sort:" value={sort} options={SORT_OPTS} onChange={setSort} />
        <div style={{ position: "relative", width: 220 }}>
          <Search
            size={16}
            color="#9A9A9A"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E2DB",
              borderRadius: 8,
              fontSize: 13,
              color: "#1A1A18",
              outline: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
