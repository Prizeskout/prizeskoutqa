import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  FieldRow,
  PrimaryButton,
  SelectField,
  TextField,
  TextareaField,
} from "./primitives";
import { Check } from "lucide-react";
import { getCompany, setCompany } from "@/lib/companyStore";

const INDUSTRIES = [
  "E-commerce / Quick commerce",
  "Retail / Hypermarket",
  "Mall / Shopping center",
  "Grocery",
  "Fashion retail",
  "Electronics retail",
  "Multi-category retail",
  "Other",
] as const;

const COUNTRIES = [
  "Qatar",
  "UAE",
  "Saudi Arabia",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Egypt",
  "Jordan",
  "Other",
] as const;

const CURRENCIES = ["QAR", "USD", "AED", "SAR", "KWD", "BHD"] as const;

export function AccountTab() {
  const [companyName, setCompanyName] = useState(() => getCompany().name);
  const [industry, setIndustry] = useState<string>("E-commerce / Quick commerce");
  const [country, setCountry] = useState<string>("Qatar");
  const [currency, setCurrency] = useState<string>("QAR");
  const [email, setEmail] = useState("pricing@snoonu.com");
  const [phone, setPhone] = useState("+974 4000 0000");
  const [description, setDescription] = useState(
    "Qatar's leading super-app for delivery, grocery, and lifestyle services. Operating across food, grocery, electronics, fashion, and more.",
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const onSave = () => {
    setCompany({ name: companyName.trim() || "Company" });
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 1800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <CardTitle>Company profile</CardTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <FieldRow>
            <Field label="Company name">
              <TextField value={companyName} onChange={setCompanyName} />
            </Field>
            <Field label="Industry">
              <SelectField value={industry} onChange={setIndustry} options={INDUSTRIES} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Country">
              <SelectField value={country} onChange={setCountry} options={COUNTRIES} />
            </Field>
            <Field label="Primary currency">
              <SelectField value={currency} onChange={setCurrency} options={CURRENCIES} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Contact email">
              <TextField value={email} onChange={setEmail} type="email" />
            </Field>
            <Field label="Contact phone">
              <TextField value={phone} onChange={setPhone} type="tel" />
            </Field>
          </FieldRow>
          <Field label="Company description">
            <TextareaField value={description} onChange={setDescription} />
          </Field>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <PrimaryButton onClick={onSave}>Save changes</PrimaryButton>
            {savedAt !== null && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#16A34A",
                  fontWeight: 500,
                }}
              >
                <Check size={14} />
                Saved
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Subscription</CardTitle>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#9A9A9A" }}>Current plan</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18", marginTop: 2 }}>
              Enterprise
            </div>
            <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
              Unlimited products, all modules, API access, dedicated support
            </div>
          </div>
          <span
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              color: "#16A34A",
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 14px",
              borderRadius: 20,
              flexShrink: 0,
            }}
          >
            Active
          </span>
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: "#9A9A9A" }}>
          Billing cycle: Monthly
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#9A9A9A" }}>
          Next invoice: May 1, 2026
        </div>
        <div style={{ marginTop: 14 }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#EA580C",
              textDecoration: "none",
            }}
          >
            Manage billing
          </a>
        </div>
      </Card>
    </div>
  );
}
