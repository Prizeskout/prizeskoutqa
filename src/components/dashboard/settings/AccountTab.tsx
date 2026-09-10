import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { getCompany, setCompany } from "@/lib/companyStore";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import {
  PLAN_LIMITS,
  PLAN_ACCENTS,
  freshnessI18nKey,
  packageFeatureKeys,
  type Plan,
} from "@/lib/plan-config";

const INDUSTRIES = [
  "Restaurant",
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
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState(() => getCompany().name);
  const [industry, setIndustry] = useState<string>("Restaurant");
  const [country, setCountry] = useState<string>("Qatar");
  const [currency, setCurrency] = useState<string>("QAR");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  // Load persisted settings on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      // Fetch plan from licensee_members → licensees
      const { data: memberRow } = await (supabase
        .from("licensee_members")
        .select("licensees(plan)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as Promise<{ data: { licensees: { plan: string } | null } | null }>);
      if (active && memberRow?.licensees?.plan) {
        const p = memberRow.licensees.plan;
        if (p === "starter" || p === "standard" || p === "enterprise") {
          setCurrentPlan(p);
        }
      }

      const { data } = await supabase
        .from("user_account_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        if (data.company_name) setCompanyName(data.company_name);
        if (data.industry) setIndustry(data.industry);
        if (data.country) setCountry(data.country);
        if (data.currency) setCurrency(data.currency);
        if (data.contact_email) setEmail(data.contact_email);
        if (data.contact_phone) setPhone(data.contact_phone);
        if (data.description) setDescription(data.description);
      }
      const merchantId=localStorage.getItem("ps_merchant_id")??"",accessCode=localStorage.getItem("ps_access_code")??"";
      if(merchantId&&accessCode){
        const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id:merchantId,access_code:accessCode,platform:"restaurant_workspace",action:"get"})});
        const result=await response.json() as {workspace?:{name?:string;country_code?:string;currency?:string;metadata?:Record<string,unknown>}};
        if(response.ok&&result.workspace){const countryByCode:Record<string,string>={QA:"Qatar",AE:"UAE",SA:"Saudi Arabia",KW:"Kuwait",BH:"Bahrain",OM:"Oman",EG:"Egypt",JO:"Jordan"};setCompanyName(result.workspace.name??companyName);setIndustry("Restaurant");setCountry(countryByCode[result.workspace.country_code??""]??country);setCurrency(result.workspace.currency??currency);setEmail(String(result.workspace.metadata?.contact_email??""));setPhone(String(result.workspace.metadata?.contact_phone??""));setDescription(String(result.workspace.metadata?.description??""));}
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again to save changes");
        return;
      }
      const trimmedCompany = companyName.trim() || "Company";
      const { error } = await supabase
        .from("user_account_settings")
        .upsert(
          {
            user_id: user.id,
            company_name: trimmedCompany,
            industry,
            country,
            currency,
            contact_email: email.trim() || null,
            contact_phone: phone.trim() || null,
            description: description.trim() || null,
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      const merchantId=localStorage.getItem("ps_merchant_id")??"",accessCode=localStorage.getItem("ps_access_code")??"";
      if(merchantId&&accessCode){const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id:merchantId,access_code:accessCode,platform:"restaurant_workspace",action:"save",name:trimmedCompany,country,currency,contact_email:email,contact_phone:phone,description})});if(!response.ok){const result=await response.json() as {error?:string};throw new Error(result.error??"Restaurant workspace could not be saved.");}}
      setCompany({ name: trimmedCompany });
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 1800);
      toast.success("Account settings saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <CardTitle>Restaurant workspace</CardTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <FieldRow>
            <Field label="Restaurant or group name">
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
            <PrimaryButton onClick={onSave}>
              {saving ? "Saving..." : loading ? "Loading..." : "Save changes"}
            </PrimaryButton>
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
        <CardTitle>{t("plans.currentPlan")}</CardTitle>
        {currentPlan ? (
          <SubscriptionCard plan={currentPlan} />
        ) : (
          <div style={{ marginTop: 16, fontSize: 13, color: "#9A9A9A" }}>
            {loading ? "…" : t("plans.contactSales")}
          </div>
        )}
      </Card>
    </div>
  );
}

function SubscriptionCard({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  const accent  = PLAN_ACCENTS[plan];
  const limits  = PLAN_LIMITS[plan];

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "#9A9A9A" }}>{t("plans.currentPlan")}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: accent, marginTop: 2 }}>
            {t(`plans.${plan}Name`)}
          </div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
            {t(`plans.${plan}Tagline`)}
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
          {t("plans.active")}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 10,
          marginTop: 16,
          backgroundColor: "#FAFAF9",
          border: "1px solid #E5E2DB",
          borderRadius: 8,
          padding: 12,
          fontSize: 12,
        }}
      >
        {[
          { label: t("plans.limit_products"),     value: limits.maxProducts === -1 ? t("plans.unlimited") : String(limits.maxProducts) },
          { label: t("plans.limit_competitors"),  value: limits.maxCompetitorsPerProduct === -1 ? t("plans.unlimited") : String(limits.maxCompetitorsPerProduct) },
          { label: t("plans.limit_channels"),     value: limits.maxChannels === -1 ? t("plans.unlimited") : String(limits.maxChannels) },
          { label: t("plans.limit_seats"),        value: limits.maxSeats === -1 ? t("plans.unlimited") : String(limits.maxSeats) },
          { label: t("plans.limit_freshness"),    value: t(freshnessI18nKey(plan)) },
          { label: t("plans.limit_mode"),         value: t(`plans.mode_${limits.mode}`) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
              {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B6B6B", marginBottom: 8 }}>
          {t(`plans.packages.${plan}.audience`)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 7 }}>
          {packageFeatureKeys(plan).map((key) => (
            <div key={key} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 11.5, color: "#4A4A48", lineHeight: 1.45 }}>
              <Check size={13} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{t(key)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "#9A9A9A" }}>
        {t("plans.billingCycle")}
      </div>

      <div style={{ marginTop: 10 }}>
        <Link
          to="/dashboard/revenue-hub"
          style={{
            fontSize: 12,
            color: accent,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {t("plans.contactSales")} →
        </Link>
      </div>
    </div>
  );
}
