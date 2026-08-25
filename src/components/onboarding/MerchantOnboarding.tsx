import { createContext, useContext, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MapPin,
  Store,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { evaluatePassword } from "@/components/auth/PasswordStrength";
import logoLight from "@/assets/logo-light.svg";
import "./MerchantOnboarding.css";
import "./MerchantOnboardingConfirmation.css";

type Stage = "account" | "channels" | "complete";
type ChannelId = "zid" | "salla" | "talabat" | "jahez" | "keeta" | "snoonu" | "foodics";
type FieldMap = Record<string, string>;
type Language = "en" | "ar";

const AR: Record<string, string> = {
  "Merchant setup": "إعداد حساب التاجر",
  Login: "تسجيل الدخول",
  Account: "الحساب",
  Channels: "القنوات",
  Ready: "جاهز",
  "ACCOUNT DETAILS": "بيانات الحساب",
  "Create your PrizeSkout account": "أنشئ حسابك في PrizeSkout",
  "Tell us who will manage the account and where your business operates.":
    "أدخل بيانات المسؤول عن الحساب وموقع نشاطك التجاري.",
  "Representative or account manager": "اسم الممثل أو مدير الحساب",
  "Full name": "الاسم الكامل",
  "Business name": "اسم المنشأة",
  "Registered or trading name": "الاسم التجاري أو المسجل",
  "Primary location": "الموقع الرئيسي",
  "Select country": "اختر الدولة",
  "Number of branches": "عدد الفروع",
  "Work email": "البريد الإلكتروني للعمل",
  Password: "كلمة المرور",
  "Confirm password": "تأكيد كلمة المرور",
  "At least 8 characters": "8 أحرف على الأقل",
  "Repeat your password": "أعد كتابة كلمة المرور",
  "Show password": "إظهار كلمة المرور",
  "Hide password": "إخفاء كلمة المرور",
  "Use 8 or more characters": "استخدم 8 أحرف أو أكثر",
  "Include an uppercase letter": "أضف حرفاً إنجليزياً كبيراً",
  "Include a lowercase letter": "أضف حرفاً إنجليزياً صغيراً",
  "Include a number or symbol": "أضف رقماً أو رمزاً",
  "Passwords match": "كلمتا المرور متطابقتان",
  "Your password should:": "يجب أن تحتوي كلمة المرور على:",
  "I agree to PrizeSkout’s": "أوافق على",
  "Terms and Privacy Policy": "الشروط وسياسة الخصوصية الخاصة بـ PrizeSkout",
  "Already have an account?": "لديك حساب بالفعل؟",
  Continue: "متابعة",
  "Creating workspace…": "جارٍ إنشاء مساحة العمل…",
  CHANNELS: "القنوات",
  "Connect your sales channels": "اربط قنوات المبيعات",
  "Choose the channels you use. You can connect them now or finish later from Settings.":
    "اختر القنوات التي تستخدمها. يمكنك ربطها الآن أو إكمال الإعداد لاحقاً من صفحة الإعدادات.",
  "Authorization complete": "اكتمل التفويض",
  "You will return here after authorization.": "ستعود إلى هذه الصفحة بعد التفويض.",
  Connected: "متصل",
  Authorize: "تفويض",
  "Set up later": "الإعداد لاحقاً",
  Back: "رجوع",
  "No channel selected — that’s okay": "لم تختر قناة — يمكنك المتابعة",
  "Finish signup": "إكمال التسجيل",
  "Securing workspace…": "جارٍ تأمين مساحة العمل…",
  "SETUP COMPLETE": "اكتمل الإعداد",
  "Your PrizeSkout account is ready.": "حسابك في PrizeSkout جاهز.",
  "Confirm your email, then log in.": "أكد بريدك الإلكتروني ثم سجل الدخول.",
  Workspace: "مساحة العمل",
  "Continue to login": "المتابعة إلى تسجيل الدخول",
  "For security, we signed you out after setup.": "لحمايتك، تم تسجيل خروجك بعد الإعداد.",
  "One workspace for every branch and channel.": "مساحة عمل واحدة لجميع الفروع والقنوات.",
  "Connect once. Return anytime.": "اربط مرة واحدة، وعد متى شئت.",
  "Setup complete.": "اكتمل الإعداد.",
  "Create the account your team will use to understand true profit across the business.":
    "أنشئ الحساب الذي سيستخدمه فريقك لفهم الربح الحقيقي في جميع أعمالك.",
  "OAuth connections leave PrizeSkout for authorization and bring you directly back to this step.":
    "سينقلك التفويض الآمن إلى القناة ثم يعيدك مباشرة إلى هذه الخطوة.",
  "Your remaining connections stay available in the dashboard.":
    "ستبقى الاتصالات المتبقية متاحة في لوحة التحكم.",
  "Commerce infrastructure": "بنية التجارة التحتية",
  "Account setup": "إعداد الحساب",
  "Channel connections": "ربط القنوات",
  "You're all set": "اكتمل الإعداد",
  "Add your business and account details. You can update them later in Settings.":
    "أضف بيانات النشاط والحساب. يمكنك تعديلها لاحقاً من الإعدادات.",
  "You will briefly leave PrizeSkout to approve OAuth connections, then return here.":
    "ستنتقل لفترة قصيرة إلى القناة للموافقة على الربط، ثم تعود إلى هنا.",
  "Any connections you skipped will remain available in Settings.":
    "ستجد أي قنوات تخطيتها متاحة لاحقاً في الإعدادات.",
  "Authorize your store securely": "فوّض متجرك بأمان",
  "Partner API credentials": "بيانات واجهة الشريك",
  "API and branch credentials": "بيانات الواجهة والفرع",
  "Continue through authorization": "المتابعة عبر التفويض",
  "Statement import during setup": "استيراد الكشوف أثناء الإعداد",
  "Guided connection after signup": "ربط موجّه بعد التسجيل",
  "Talabat Partner API": "واجهة شركاء طلبات",
  "Use the credentials issued after Talabat approves your integration.":
    "استخدم بيانات الاعتماد التي تصدرها طلبات بعد اعتماد التكامل.",
  Sandbox: "بيئة الاختبار",
  Production: "بيئة الإنتاج",
  "Client ID": "معرّف العميل",
  "Client secret": "سر العميل",
  "Vendor ID": "معرّف البائع",
  "Chain ID": "معرّف السلسلة",
  "Contract commission (%)": "عمولة العقد (%)",
  "Credentials are encrypted at rest and never shown again.":
    "تُشفّر بيانات الاعتماد ولا يتم عرضها مرة أخرى.",
  "API key": "مفتاح API",
  "Secret code": "الرمز السري",
  "Branch ID": "معرّف الفرع",
  "Enter the credentials supplied for your branch.": "أدخل بيانات الاعتماد الصادرة لفرعك.",
  "Finish signup now. We will guide this connection from your dashboard.":
    "أكمل التسجيل الآن وسنرشدك إلى الربط من لوحة التحكم.",
  "Complete every required field to continue.": "أكمل جميع الحقول المطلوبة للمتابعة.",
  "Complete every required business field to continue.":
    "أكمل جميع بيانات المنشأة المطلوبة للمتابعة.",
  "Enter a valid work email address.": "أدخل بريداً إلكترونياً صالحاً للعمل.",
  "Enter a valid number of branches.": "أدخل عدداً صحيحاً للفروع.",
  "The passwords do not match.": "كلمتا المرور غير متطابقتين.",
  "Use at least 8 characters with a mix of letters, numbers, or symbols.":
    "استخدم 8 أحرف على الأقل مع مزيج من الحروف والأرقام أو الرموز.",
  "Accept the Terms and Privacy Policy to create the account.":
    "وافق على الشروط وسياسة الخصوصية لإنشاء الحساب.",
};

const LanguageContext = createContext({ lang: "en" as Language, tr: (value: string) => value });
const useLanguage = () => useContext(LanguageContext);

const REGIONS = ["Qatar", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Oman"];
const REGION_CODE: Record<string, string> = {
  Qatar: "QA",
  "Saudi Arabia": "SA",
  UAE: "AE",
  Kuwait: "KW",
  Bahrain: "BH",
  Oman: "OM",
};
const REGION_CURRENCY: Record<string, string> = {
  Qatar: "QAR",
  "Saudi Arabia": "SAR",
  UAE: "AED",
  Kuwait: "KWD",
  Bahrain: "BHD",
  Oman: "OMR",
};

const CHANNELS: Array<{
  id: ChannelId;
  name: string;
  note: string;
  logo: string;
  mode: "oauth" | "credentials" | "assisted";
}> = [
  {
    id: "zid",
    name: "Zid",
    note: "Authorize your store securely",
    logo: "/channel-logos/zid.png",
    mode: "oauth",
  },
  {
    id: "salla",
    name: "Salla",
    note: "Authorize your store securely",
    logo: "/channel-logos/salla.png",
    mode: "oauth",
  },
  {
    id: "talabat",
    name: "Talabat",
    note: "Partner API credentials",
    logo: "/channel-logos/talabat.png",
    mode: "credentials",
  },
  {
    id: "jahez",
    name: "Jahez",
    note: "API and branch credentials",
    logo: "/channel-logos/jahez.svg",
    mode: "credentials",
  },
  {
    id: "keeta",
    name: "Keeta",
    note: "Continue through authorization",
    logo: "/channel-logos/keeta.svg",
    mode: "oauth",
  },
  {
    id: "snoonu",
    name: "Snoonu",
    note: "Statement import during setup",
    logo: "/channel-logos/snoonu.png",
    mode: "assisted",
  },
  {
    id: "foodics",
    name: "Foodics",
    note: "Guided connection after signup",
    logo: "/channel-logos/foodics.png",
    mode: "assisted",
  },
];

const readSession = (key: string) =>
  typeof window === "undefined" ? "" : (sessionStorage.getItem(key) ?? "");
const readLocal = (key: string) =>
  typeof window === "undefined" ? "" : (localStorage.getItem(key) ?? "");

function field(
  value: string,
  onChange: (value: string) => void,
  props: React.InputHTMLAttributes<HTMLInputElement> = {},
) {
  return (
    <input
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mo-input"
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mo-label">{children}</label>;
}

function Progress({ stage }: { stage: Stage }) {
  const { tr } = useLanguage();
  const active = stage === "account" ? 0 : stage === "channels" ? 1 : 2;
  return (
    <ol className="mo-progress" aria-label="Signup progress">
      {["Account", "Channels", "Ready"].map((label, index) => (
        <li key={label} className={index < active ? "done" : index === active ? "active" : ""}>
          <span>{index < active ? <Check size={13} /> : index + 1}</span>
          <b>{tr(label)}</b>
        </li>
      ))}
    </ol>
  );
}

function PasswordGuide({ password, confirmation }: { password: string; confirmation: string }) {
  const { tr } = useLanguage();
  const checks = [
    { label: "Use 8 or more characters", valid: password.length >= 8 },
    { label: "Include an uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Include a lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Include a number or symbol", valid: /[0-9]|[^A-Za-z0-9]/.test(password) },
    { label: "Passwords match", valid: confirmation.length > 0 && password === confirmation },
  ];
  return (
    <div className="mo-password-guide" aria-live="polite">
      <p>{tr("Your password should:")}</p>
      <ul>
        {checks.map((item) => (
          <li className={item.valid ? "valid" : ""} key={item.label}>
            <span>{item.valid ? <Check size={12} /> : "·"}</span>
            {tr(item.label)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountStep({
  onCreated,
}: {
  onCreated: (data: {
    merchantId: string;
    token: string;
    email: string;
    businessName: string;
    location: string;
    confirmationRequired: boolean;
  }) => void;
}) {
  const { tr, lang } = useLanguage();
  const [representative, setRepresentative] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [branches, setBranches] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRepresentative(readSession("ps_ob_representative"));
    setBusinessName(readSession("ps_ob_business"));
    setLocation(readSession("ps_ob_location"));
    setBranches(readSession("ps_ob_branches"));
    setEmail(readSession("ps_ob_email"));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const branchCount = Number(branches);
    const existingToken = readSession("ps_ob_capability");
    const existingMerchantId = readLocal("ps_merchant_id");
    if (existingToken && existingMerchantId) {
      if (
        ![representative, businessName, location, branches, email].every((value) => value.trim())
      ) {
        setError(tr("Complete every required business field to continue."));
        return;
      }
      onCreated({
        merchantId: existingMerchantId,
        token: existingToken,
        email: email.trim().toLowerCase(),
        businessName: businessName.trim(),
        location,
        confirmationRequired: readSession("ps_ob_confirmation_required") === "1",
      });
      return;
    }
    if (
      ![representative, businessName, location, branches, email, password, confirmPassword].every(
        (value) => value.trim(),
      )
    ) {
      setError(tr("Complete every required field to continue."));
      return;
    }
    if (!email.includes("@")) {
      setError(tr("Enter a valid work email address."));
      return;
    }
    if (!Number.isInteger(branchCount) || branchCount < 1 || branchCount > 10_000) {
      setError(tr("Enter a valid number of branches."));
      return;
    }
    if (password !== confirmPassword) {
      setError(tr("The passwords do not match."));
      return;
    }
    if (evaluatePassword(password).score < 2) {
      setError(tr("Use at least 8 characters with a mix of letters, numbers, or symbols."));
      return;
    }
    if (!terms) {
      setError(tr("Accept the Terms and Privacy Policy to create the account."));
      return;
    }

    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            representative_name: representative.trim(),
            business_name: businessName.trim(),
            location,
            branch_count: branchCount,
            onboarding_status: "channels_pending",
          },
        },
      });
      if (signupError) throw signupError;

      const response = await fetch("/api/onboarding/session", { method: "POST" });
      const session = (await response.json()) as {
        merchant_id?: string;
        token?: string;
        error?: string;
      };
      if (!response.ok || !session.merchant_id || !session.token)
        throw new Error(session.error ?? "Could not start onboarding.");

      sessionStorage.setItem("ps_ob_representative", representative.trim());
      sessionStorage.setItem("ps_ob_business", businessName.trim());
      sessionStorage.setItem("ps_ob_location", location);
      sessionStorage.setItem("ps_ob_branches", String(branchCount));
      sessionStorage.setItem("ps_ob_email", normalizedEmail);
      sessionStorage.setItem("ps_ob_capability", session.token);
      sessionStorage.setItem("ps_ob_confirmation_required", signupData.session ? "0" : "1");
      localStorage.setItem("ps_merchant_id", session.merchant_id);
      onCreated({
        merchantId: session.merchant_id,
        token: session.token,
        email: normalizedEmail,
        businessName: businessName.trim(),
        location,
        confirmationRequired: !signupData.session,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Account creation failed.";
      setError(
        /already|registered/i.test(message)
          ? "An account already exists for this email. Sign in instead."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mo-form">
      <header className="mo-step-header">
        <p>{tr("ACCOUNT DETAILS")}</p>
        <h1>{tr("Create your PrizeSkout account")}</h1>
        <span>{tr("Tell us who will manage the account and where your business operates.")}</span>
      </header>

      <div className="mo-field-grid">
        <div>
          <Label>{tr("Representative or account manager")}</Label>
          {field(representative, setRepresentative, {
            placeholder: tr("Full name"),
            autoComplete: "name",
            required: true,
          })}
        </div>
        <div>
          <Label>{tr("Business name")}</Label>
          {field(businessName, setBusinessName, {
            placeholder: tr("Registered or trading name"),
            autoComplete: "organization",
            required: true,
          })}
        </div>
        <div>
          <Label>{tr("Primary location")}</Label>
          <div className="mo-select-wrap">
            <MapPin size={16} />
            <select
              className="mo-input mo-select"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
            >
              <option value="">{tr("Select country")}</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {lang === "ar"
                    ? (
                        {
                          Qatar: "قطر",
                          "Saudi Arabia": "السعودية",
                          UAE: "الإمارات",
                          Kuwait: "الكويت",
                          Bahrain: "البحرين",
                          Oman: "عُمان",
                        } as Record<string, string>
                      )[region]
                    : region}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </div>
        </div>
        <div>
          <Label>{tr("Number of branches")}</Label>
          {field(branches, setBranches, {
            placeholder: "1",
            type: "number",
            min: 1,
            max: 10000,
            inputMode: "numeric",
            required: true,
          })}
        </div>
      </div>

      <div>
        <Label>{tr("Work email")}</Label>
        {field(email, setEmail, {
          placeholder: "name@business.com",
          type: "email",
          autoComplete: "email",
          required: true,
        })}
      </div>

      <div className="mo-field-grid">
        <div>
          <Label>{tr("Password")}</Label>
          <div className="mo-password">
            {field(password, setPassword, {
              type: showPassword ? "text" : "password",
              placeholder: tr("At least 8 characters"),
              autoComplete: "new-password",
              minLength: 8,
              required: true,
            })}
            <button
              type="button"
              aria-label={tr(showPassword ? "Hide password" : "Show password")}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <Label>{tr("Confirm password")}</Label>
          <div className="mo-password">
            {field(confirmPassword, setConfirmPassword, {
              type: showConfirmPassword ? "text" : "password",
              placeholder: tr("Repeat your password"),
              autoComplete: "new-password",
              minLength: 8,
              required: true,
            })}
            <button
              type="button"
              aria-label={tr(showConfirmPassword ? "Hide password" : "Show password")}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      <PasswordGuide password={password} confirmation={confirmPassword} />

      <label className="mo-terms">
        <input
          type="checkbox"
          checked={terms}
          onChange={(event) => setTerms(event.target.checked)}
        />
        <span>
          {tr("I agree to PrizeSkout’s")} <a href="/legal">{tr("Terms and Privacy Policy")}</a>.
        </span>
      </label>
      {error && (
        <div className="mo-error" role="alert">
          {error}
        </div>
      )}
      <div className="mo-actions">
        <span>
          {tr("Already have an account?")} <a href="/access">{tr("Login")}</a>
        </span>
        <button className="mo-primary" disabled={submitting}>
          {submitting ? (
            tr("Creating workspace…")
          ) : (
            <>
              {tr("Continue")} <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function CredentialInput({
  label,
  value,
  onChange,
  secret,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  secret?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {field(value, onChange, {
        type: secret ? "password" : "text",
        placeholder,
        autoComplete: "off",
      })}
    </div>
  );
}

function ChannelsStep({
  merchantId,
  token,
  email,
  businessName,
  location,
  onBack,
  onComplete,
}: {
  merchantId: string;
  token: string;
  email: string;
  businessName: string;
  location: string;
  onBack: () => void;
  onComplete: (connected: string[], deferred: string[]) => void;
}) {
  const { tr, lang } = useLanguage();
  const saved = (() => {
    try {
      return JSON.parse(readSession("ps_ob_channels") || "[]") as ChannelId[];
    } catch {
      return [];
    }
  })();
  const [selected, setSelected] = useState<ChannelId[]>(saved);
  const [connected, setConnected] = useState<ChannelId[]>([]);
  const [talabat, setTalabat] = useState<FieldMap>({ environment: "sandbox" });
  const [jahez, setJahez] = useState<FieldMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restored: ChannelId[] = [];
    if (params.get("zid_connected") === "1") restored.push("zid");
    if (params.get("salla_connected") === "1") restored.push("salla");
    if (params.get("keeta_connected") === "1") restored.push("keeta");
    if (restored.length) {
      setConnected((current) => [...new Set([...current, ...restored])]);
      setSelected((current) => [...new Set([...current, ...restored])]);
      window.history.replaceState({}, "", "/onboarding");
    }
  }, []);

  function toggle(id: ChannelId) {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      sessionStorage.setItem("ps_ob_channels", JSON.stringify(next));
      return next;
    });
  }

  function oauth(channel: "zid" | "salla" | "keeta") {
    sessionStorage.setItem("ps_ob_channels", JSON.stringify(selected));
    if (channel === "keeta") {
      window.location.assign(
        `/api/channels/connect?oauth=keeta&merchant_id=${encodeURIComponent(merchantId)}&onboarding_token=${encodeURIComponent(token)}&return_to=%2Fonboarding`,
      );
      return;
    }
    window.location.assign(
      `/api/auth/${channel}?merchant_id=${encodeURIComponent(merchantId)}&onboarding_token=${encodeURIComponent(token)}&return_to=%2Fonboarding`,
    );
  }

  async function finish() {
    setError("");
    setSubmitting(true);
    try {
      const talabatRequired = [
        "client_id",
        "client_secret",
        "vendor_id",
        "chain_id",
        "commission_rate_pct",
      ];
      const jahezRequired = ["api_key", "secret_code", "branch_id"];
      const talabatStarted =
        selected.includes("talabat") &&
        Object.entries(talabat).some(([key, value]) => key !== "environment" && value.trim());
      const jahezStarted =
        selected.includes("jahez") && Object.values(jahez).some((value) => value.trim());
      if (talabatStarted && !talabatRequired.every((key) => talabat[key]?.trim()))
        throw new Error(
          "Complete all Talabat credential fields, or leave them empty and connect Talabat later.",
        );
      if (jahezStarted && !jahezRequired.every((key) => jahez[key]?.trim()))
        throw new Error(
          "Complete all Jahez credential fields, or leave them empty and connect Jahez later.",
        );

      const registration = await fetch("/api/register-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          onboarding_token: token,
          region_code: REGION_CODE[location] ?? "QA",
          email,
          store_name: businessName,
        }),
      });
      const registrationData = (await registration.json()) as { code?: string; error?: string };
      if (!registration.ok || !registrationData.code)
        throw new Error(registrationData.error ?? "Could not secure your workspace.");

      const newlyConnected = [...connected];
      for (const [platform, credentials, ready] of [
        ["talabat", talabat, talabatStarted],
        ["jahez", jahez, jahezStarted],
      ] as const) {
        if (!ready) continue;
        const response = await fetch("/api/channels/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: registrationData.code,
            platform,
            ...credentials,
            ...(platform === "talabat"
              ? { contract_currency: REGION_CURRENCY[location] ?? "QAR" }
              : {}),
          }),
        });
        const result = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !result.ok)
          throw new Error(result.error ?? `Could not connect ${platform}.`);
        newlyConnected.push(platform as ChannelId);
      }

      localStorage.setItem("ps_merchant_id", merchantId);
      localStorage.setItem("ps_access_code", registrationData.code);
      localStorage.setItem("ps_connected", "true");
      const uniqueConnected = [...new Set(newlyConnected)];
      const deferred = selected.filter((id) => !uniqueConnected.includes(id));
      await supabase.auth.signOut();
      onComplete(
        uniqueConnected.map((id) => CHANNELS.find((channel) => channel.id === id)?.name ?? id),
        deferred.map((id) => CHANNELS.find((channel) => channel.id === id)?.name ?? id),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedChannels = useMemo(
    () => CHANNELS.filter((channel) => selected.includes(channel.id)),
    [selected],
  );
  return (
    <div className="mo-form">
      <header className="mo-step-header">
        <p>{tr("CHANNELS")}</p>
        <h1>{tr("Connect your sales channels")}</h1>
        <span>
          {tr(
            "Choose the channels you use. You can connect them now or finish later from Settings.",
          )}
        </span>
      </header>
      <div className="mo-channel-grid">
        {CHANNELS.map((channel) => (
          <button
            key={channel.id}
            type="button"
            className={`mo-channel ${selected.includes(channel.id) ? "selected" : ""}`}
            onClick={() => toggle(channel.id)}
            aria-pressed={selected.includes(channel.id)}
          >
            <img src={channel.logo} alt="" />
            <span>
              <b>{channel.name}</b>
              <small>{tr(channel.note)}</small>
            </span>
            <i>{selected.includes(channel.id) ? <Check size={14} /> : "+"}</i>
          </button>
        ))}
      </div>

      {selectedChannels.length > 0 && (
        <div className="mo-connector-stack">
          {selectedChannels.map((channel) => {
            if (channel.mode === "oauth")
              return (
                <section key={channel.id} className="mo-connector">
                  <div>
                    <img src={channel.logo} alt="" />
                    <span>
                      <b>{channel.name}</b>
                      <small>
                        {connected.includes(channel.id)
                          ? tr("Authorization complete")
                          : tr("You will return here after authorization.")}
                      </small>
                    </span>
                  </div>
                  {connected.includes(channel.id) ? (
                    <strong className="mo-connected">
                      <Check size={14} /> {tr("Connected")}
                    </strong>
                  ) : (
                    <button
                      type="button"
                      className="mo-secondary"
                      onClick={() => oauth(channel.id as "zid" | "salla" | "keeta")}
                    >
                      {tr("Authorize")} {channel.name} <ArrowRight size={14} />
                    </button>
                  )}
                </section>
              );
            if (channel.id === "talabat")
              return (
                <section key={channel.id} className="mo-connector mo-credentials">
                  <div className="mo-connector-title">
                    <div>
                      <img src={channel.logo} alt="" />
                      <span>
                        <b>{tr("Talabat Partner API")}</b>
                        <small>
                          {tr(
                            "Use the credentials issued after Talabat approves your integration.",
                          )}
                        </small>
                      </span>
                    </div>
                    <select
                      value={talabat.environment}
                      onChange={(event) =>
                        setTalabat({ ...talabat, environment: event.target.value })
                      }
                    >
                      <option value="sandbox">{tr("Sandbox")}</option>
                      <option value="production">{tr("Production")}</option>
                    </select>
                  </div>
                  <div className="mo-credential-grid">
                    <CredentialInput
                      label={tr("Client ID")}
                      value={talabat.client_id ?? ""}
                      onChange={(value) => setTalabat({ ...talabat, client_id: value })}
                    />
                    <CredentialInput
                      label={tr("Client secret")}
                      secret
                      value={talabat.client_secret ?? ""}
                      onChange={(value) => setTalabat({ ...talabat, client_secret: value })}
                    />
                    <CredentialInput
                      label={tr("Vendor ID")}
                      value={talabat.vendor_id ?? ""}
                      onChange={(value) => setTalabat({ ...talabat, vendor_id: value })}
                    />
                    <CredentialInput
                      label={tr("Chain ID")}
                      value={talabat.chain_id ?? ""}
                      onChange={(value) => setTalabat({ ...talabat, chain_id: value })}
                    />
                    <CredentialInput
                      label={tr("Contract commission (%)")}
                      placeholder="e.g. 19"
                      value={talabat.commission_rate_pct ?? ""}
                      onChange={(value) => setTalabat({ ...talabat, commission_rate_pct: value })}
                    />
                  </div>
                  <p className="mo-help">
                    <LockKeyhole size={13} />{" "}
                    {tr("Credentials are encrypted at rest and never shown again.")}
                  </p>
                </section>
              );
            if (channel.id === "jahez")
              return (
                <section key={channel.id} className="mo-connector mo-credentials">
                  <div className="mo-connector-title">
                    <div>
                      <img src={channel.logo} alt="" />
                      <span>
                        <b>Jahez</b>
                        <small>{tr("Enter the credentials supplied for your branch.")}</small>
                      </span>
                    </div>
                  </div>
                  <div className="mo-credential-grid">
                    <CredentialInput
                      label={tr("API key")}
                      value={jahez.api_key ?? ""}
                      onChange={(value) => setJahez({ ...jahez, api_key: value })}
                    />
                    <CredentialInput
                      label={tr("Secret code")}
                      secret
                      value={jahez.secret_code ?? ""}
                      onChange={(value) => setJahez({ ...jahez, secret_code: value })}
                    />
                    <CredentialInput
                      label={tr("Branch ID")}
                      value={jahez.branch_id ?? ""}
                      onChange={(value) => setJahez({ ...jahez, branch_id: value })}
                    />
                  </div>
                </section>
              );
            return (
              <section key={channel.id} className="mo-connector">
                <div>
                  <img src={channel.logo} alt="" />
                  <span>
                    <b>{channel.name}</b>
                    <small>
                      {tr("Finish signup now. We will guide this connection from your dashboard.")}
                    </small>
                  </span>
                </div>
                <strong className="mo-later">{tr("Set up later")}</strong>
              </section>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mo-error" role="alert">
          {error}
        </div>
      )}
      <div className="mo-actions">
        <button type="button" className="mo-back" onClick={onBack}>
          <ArrowLeft size={15} /> {tr("Back")}
        </button>
        <div>
          <small>
            {selected.length
              ? lang === "ar"
                ? `تم اختيار ${selected.length} من القنوات`
                : `${selected.length} channel${selected.length === 1 ? "" : "s"} selected`
              : tr("No channel selected — that’s okay")}
          </small>
          <button type="button" className="mo-primary" onClick={finish} disabled={submitting}>
            {submitting ? (
              tr("Securing workspace…")
            ) : (
              <>
                {tr("Finish signup")} <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteStep({
  connected,
  deferred,
  businessName,
  email,
  confirmationRequired,
}: {
  connected: string[];
  deferred: string[];
  businessName: string;
  email: string;
  confirmationRequired: boolean;
}) {
  const { tr, lang } = useLanguage();
  return (
    <div className="mo-complete">
      <div className="mo-complete-mark">
        <Check size={24} />
      </div>
      <p>{tr("SETUP COMPLETE")}</p>
      <h1>
        {confirmationRequired
          ? tr("Confirm your email, then log in.")
          : tr("Your PrizeSkout account is ready.")}
      </h1>
      <span>
        {lang === "ar"
          ? connected.length
            ? `تم ربط ${connected.join("، ")}.`
            : "مساحة عملك جاهزة لأول عملية ربط."
          : connected.length
            ? `${connected.join(", ")} ${connected.length === 1 ? "is" : "are"} connected.`
            : "Your workspace is ready for its first connection."}{" "}
        {deferred.length
          ? lang === "ar"
            ? `يمكن إكمال ربط ${deferred.join("، ")} لاحقاً من صفحة القنوات.`
            : `${deferred.join(", ")} can be completed later from Channels.`
          : ""}
      </span>
      <div className="mo-complete-summary">
        <div>
          <Building2 size={17} />
          <span>
            <small>{tr("Workspace")}</small>
            <b>{businessName}</b>
          </span>
        </div>
        <div>
          <UserRound size={17} />
          <span>
            <small>{tr("Account")}</small>
            <b>{email}</b>
          </span>
        </div>
      </div>
      {confirmationRequired && (
        <div className="mo-confirmation-note">
          {lang === "ar" ? (
            <>
              أرسلنا رابط تأكيد إلى <b>{email}</b>. افتحه قبل تسجيل الدخول.
            </>
          ) : (
            <>
              We sent a confirmation link to <b>{email}</b>. Open it before logging in.
            </>
          )}
        </div>
      )}
      <a className="mo-primary mo-login" href="/access">
        {tr("Continue to login")} <ArrowRight size={16} />
      </a>
      <small className="mo-complete-note">
        {tr("For security, we signed you out after setup.")}
      </small>
    </div>
  );
}

export function MerchantOnboarding() {
  const [lang, setLang] = useState<Language>("en");
  const [stage, setStage] = useState<Stage>("account");
  const [merchantId, setMerchantId] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [connected, setConnected] = useState<string[]>([]);
  const [deferred, setDeferred] = useState<string[]>([]);
  const tr = (value: string) => (lang === "ar" ? (AR[value] ?? value) : value);

  useEffect(() => {
    const storedToken = readSession("ps_ob_capability");
    setMerchantId(readLocal("ps_merchant_id"));
    setToken(storedToken);
    setEmail(readSession("ps_ob_email"));
    setBusinessName(readSession("ps_ob_business"));
    setLocation(readSession("ps_ob_location"));
    setConfirmationRequired(readSession("ps_ob_confirmation_required") === "1");
    if (/(?:zid|salla|keeta)_connected=1/.test(window.location.search) || storedToken)
      setStage("channels");
    if (readLocal("ps_language") === "ar") setLang("ar");
  }, []);

  function switchLanguage() {
    const next = lang === "en" ? "ar" : "en";
    setLang(next);
    localStorage.setItem("ps_language", next);
  }

  return (
    <LanguageContext.Provider value={{ lang, tr }}>
      <main className="mo-shell" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
        <nav className="mo-nav">
          <a href="/">
            <img src={logoLight} alt="PrizeSkout" />
          </a>
          <span>{tr("Merchant setup")}</span>
          <div className="mo-nav-actions">
            <button type="button" className="mo-language" onClick={switchLanguage}>
              {lang === "en" ? "العربية" : "English"}
            </button>
            <a href="/access">{tr("Login")}</a>
          </div>
        </nav>
        <div className="mo-layout">
          <aside>
            <div className="mo-aside-icon">
              {stage === "account" ? (
                <Store size={22} />
              ) : stage === "channels" ? (
                <KeyRound size={22} />
              ) : (
                <Check size={22} />
              )}
            </div>
            <p>
              {tr(
                stage === "account"
                  ? "Account setup"
                  : stage === "channels"
                    ? "Channel connections"
                    : "You're all set",
              )}
            </p>
            <span>
              {tr(
                stage === "account"
                  ? "Add your business and account details. You can update them later in Settings."
                  : stage === "channels"
                    ? "You will briefly leave PrizeSkout to approve OAuth connections, then return here."
                    : "Any connections you skipped will remain available in Settings.",
              )}
            </span>
            <footer>
              PrizeSkout {"·"} {tr("Commerce infrastructure")}
            </footer>
          </aside>
          <section className="mo-card">
            <Progress stage={stage} />
            {stage === "account" ? (
              <AccountStep
                onCreated={(data) => {
                  setMerchantId(data.merchantId);
                  setToken(data.token);
                  setEmail(data.email);
                  setBusinessName(data.businessName);
                  setLocation(data.location);
                  setConfirmationRequired(data.confirmationRequired);
                  setStage("channels");
                }}
              />
            ) : stage === "channels" ? (
              <ChannelsStep
                merchantId={merchantId}
                token={token}
                email={email}
                businessName={businessName}
                location={location}
                onBack={() => setStage("account")}
                onComplete={(connectedChannels, deferredChannels) => {
                  setConnected(connectedChannels);
                  setDeferred(deferredChannels);
                  setStage("complete");
                }}
              />
            ) : (
              <CompleteStep
                connected={connected}
                deferred={deferred}
                businessName={businessName}
                email={email}
                confirmationRequired={confirmationRequired}
              />
            )}
          </section>
        </div>
      </main>
    </LanguageContext.Provider>
  );
}
