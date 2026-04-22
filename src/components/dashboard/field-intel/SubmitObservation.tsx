import { useState, type CSSProperties } from "react";
import { CheckCircle, ChevronDown, Upload } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const STORES = [
  "Carrefour - Doha Festival City",
  "Carrefour - Mall of Qatar",
  "Carrefour - Landmark Mall",
  "Lulu - Lusail",
  "Lulu - Al Gharafa",
  "Lulu - Al Messila",
  "Other (specify)",
];

const CATEGORIES = ["Electronics", "Grocery", "Fashion", "Home", "Beauty", "Baby & Kids", "Sports", "Other"];

const CONDITIONS = ["Regular price", "On promotion", "Clearance"] as const;
type Condition = (typeof CONDITIONS)[number];

const inputStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "white",
  border: "1px solid #E5E2DB",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  color: "#1A1A18",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "#6B6B6B",
  marginBottom: 4,
};

function StyledSelect({
  value,
  onChange,
  children,
  placeholder,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", ...style }} suppressHydrationWarning>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
        suppressHydrationWarning
        style={{
          ...inputStyle,
          appearance: "none",
          paddingRight: 36,
          color: value === "" ? "#9A9A9A" : "#1A1A18",
          cursor: "pointer",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown
        size={16}
        color="#9A9A9A"
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function SubmitObservation() {
  const router = useRouter();
  const [store, setStore] = useState("");
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("QAR");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState<Condition>("Regular price");
  const [promoDetail, setPromoDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPromoField = condition === "On promotion" || condition === "Clearance";

  const handleSubmit = async () => {
    setError(null);
    if (!store || !product || !price || !category) {
      setError("Please fill in store, product, price, and category.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to submit an observation.");
        setSubmitting(false);
        return;
      }

      const displayName =
        (user.user_metadata?.display_name as string | undefined) ||
        (user.email ? user.email.split("@")[0] : "You");

      const promo = showPromoField ? promoDetail.trim() : "";
      const promoWithNotes = [promo, notes.trim()].filter(Boolean).join(" - ") || null;

      const { error: insertError } = await supabase.from("recent_observations").insert({
        user_id: user.id,
        product,
        store,
        price: priceNum,
        condition,
        promo_detail: promoWithNotes,
        status: "Pending",
        agent: displayName,
        time_label: "Just now",
        position: -Date.now(), // newest first when sorted ascending
      });

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }

      await router.invalidate();

      setSubmitted(true);
      setSubmitting(false);
      setTimeout(() => {
        setStore("");
        setProduct("");
        setPrice("");
        setCurrency("QAR");
        setCategory("");
        setCondition("Regular price");
        setPromoDetail("");
        setNotes("");
        setSubmitted(false);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit observation.");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Submit price observation</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Record a competitor's in-store price from the field
      </div>

      {submitted ? (
        <div
          style={{
            marginTop: 18,
            backgroundColor: "rgba(34, 197, 94, 0.06)",
            border: "1px solid rgba(34, 197, 94, 0.15)",
            borderRadius: 10,
            padding: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <CheckCircle size={24} color="#22C55E" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: "#22C55E" }}>
            Observation submitted successfully. It will appear in the review feed.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          <div>
            <label style={labelStyle}>Competitor store</label>
            <StyledSelect value={store} onChange={setStore} placeholder="Select store location">
              {STORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </StyledSelect>
          </div>

          <div>
            <label style={labelStyle}>Product name</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g., Samsung Galaxy S24 Ultra 256GB"
              onFocus={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Price observed</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                onFocus={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
                style={{ ...inputStyle, flex: 3 }}
              />
              <StyledSelect value={currency} onChange={setCurrency} style={{ flex: 1 }}>
                <option value="QAR">QAR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
              </StyledSelect>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <StyledSelect value={category} onChange={setCategory} placeholder="Select category">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </StyledSelect>
          </div>

          <div>
            <label style={labelStyle}>Product condition</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CONDITIONS.map((c) => {
                const active = condition === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      backgroundColor: active ? "#EA580C" : "white",
                      color: active ? "white" : "#6B6B6B",
                      border: `1px solid ${active ? "#EA580C" : "#E5E2DB"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {showPromoField && (
            <div>
              <label style={labelStyle}>Promotion details</label>
              <input
                type="text"
                value={promoDetail}
                onChange={(e) => setPromoDetail(e.target.value)}
                placeholder="e.g., 20% off, buy 2 get 1 free"
                onFocus={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context, e.g., shelf placement, stock levels, signage"
              onFocus={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
              style={{
                ...inputStyle,
                height: 80,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Photo of shelf tag (optional)</label>
            <div
              style={{
                border: "2px dashed #E5E2DB",
                borderRadius: 10,
                padding: 24,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#EA580C";
                e.currentTarget.style.backgroundColor = "rgba(234, 88, 12, 0.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E2DB";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Upload size={24} color="#9A9A9A" style={{ display: "inline-block" }} />
              <div style={{ fontSize: 13, color: "#6B6B6B", marginTop: 8 }}>
                Click to upload or drag and drop
              </div>
              <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>PNG, JPG up to 5MB</div>
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "#B91C1C",
                backgroundColor: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.backgroundColor = "#C2410C";
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.currentTarget.style.backgroundColor = "#EA580C";
            }}
            onMouseDown={(e) => {
              if (!submitting) e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              if (!submitting) e.currentTarget.style.transform = "scale(1)";
            }}
            style={{
              width: "100%",
              backgroundColor: submitting ? "#F4A679" : "#EA580C",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              padding: 12,
              borderRadius: 8,
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {submitting ? "Submitting…" : "Submit observation"}
          </button>
        </div>
      )}
    </div>
  );
}
