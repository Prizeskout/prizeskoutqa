import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const OG = "#EF681A";
interface Outlet {
  id: string;
  external_id?: string;
  name: string;
  city: string;
  region: string;
  active: boolean;
}
interface BranchAssignment { id:string;branch_id:string;platform:string;external_branch_id:string;pos_external_id:string|null;active:boolean }
const REGIONS = ["Qatar", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Oman"];
const CITIES: Record<string, string[]> = {
  Qatar: ["Doha", "Al Wakrah", "Al Khor", "Lusail"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Dammam", "Mecca"],
  UAE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  Kuwait: ["Kuwait City", "Hawalli", "Farwaniya"],
  Bahrain: ["Manama", "Muharraq", "Riffa"],
  Oman: ["Muscat", "Salalah", "Sohar"],
};
const BLANK = { name: "", external_id: "", city: "", region: "Qatar" };

export function LocationsTab() {
  const { t } = useTranslation();
  const [outlets, setOutlets] = useState<Outlet[]>([]),
    [adding, setAdding] = useState(false),
    [draft, setDraft] = useState({ ...BLANK });
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [assignments,setAssignments]=useState<BranchAssignment[]>([]);
  const [assignmentDraft,setAssignmentDraft]=useState({branch_id:"",channel:"snoonu",external_branch_id:""});
  const call = async (body: Record<string, string>) => {
    const response = await fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: localStorage.getItem("ps_merchant_id") ?? "",
        access_code: localStorage.getItem("ps_access_code") ?? "",
        platform: "locations",
        ...body,
      }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      locations?: Outlet[];
      location?: Outlet;
      error?: string;
    };
    if (!response.ok || !data.ok) throw new Error(data.error ?? "Location request failed.");
    return data;
  };
  const assignmentCall=async(body:Record<string,string>)=>{
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id:localStorage.getItem("ps_merchant_id")??"",access_code:localStorage.getItem("ps_access_code")??"",platform:"branch_assignments",...body})});
    const data=await response.json() as {ok?:boolean;assignments?:BranchAssignment[];assignment?:BranchAssignment;error?:string};
    if(!response.ok||!data.ok)throw new Error(data.error??"Branch mapping request failed.");return data;
  };
  useEffect(() => {
    let cancelled = false;
    void call({ action: "list" })
      .then((data) => {
        if (!cancelled) { const rows=data.locations??[];setOutlets(rows);setAssignmentDraft(current=>({...current,branch_id:current.branch_id||rows[0]?.id||""}));void assignmentCall({action:"list"}).then(result=>{if(!cancelled)setAssignments(result.assignments??[]);}); }
      })
      .catch((reason) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Locations could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const add = async () => {
    if (!draft.name.trim() || !draft.city) return;
    setBusy(true);
    setError("");
    try {
      const data = await call({
        action: "create",
        name: draft.name.trim(),
        external_id: draft.external_id.trim(),
        pos_external_id: draft.external_id.trim(),
        city: draft.city,
        region: draft.region,
      });
      if (data.location) setOutlets((current) => [...current, data.location!]);
      setDraft({ ...BLANK });
      setAdding(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Location could not be added.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await call({ action: "delete", id });
      setOutlets((current) => current.map((outlet) => outlet.id === id ? {...outlet,active:false} : outlet));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Location could not be removed.");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (outlet: Outlet) => {
    setBusy(true);
    setError("");
    try {
      const data = await call({ action: "toggle", id: outlet.id, active: String(!outlet.active) });
      if (data.location)
        setOutlets((current) =>
          current.map((item) => (item.id === outlet.id ? data.location! : item)),
        );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Location status could not be changed.");
    } finally {
      setBusy(false);
    }
  };
  const saveAssignment=async()=>{if(!assignmentDraft.branch_id||!assignmentDraft.channel.trim()||!assignmentDraft.external_branch_id.trim())return;setBusy(true);setError("");try{const data=await assignmentCall({action:"save",...assignmentDraft});if(data.assignment)setAssignments(current=>[...current.filter(row=>!(row.branch_id===data.assignment!.branch_id&&row.platform===data.assignment!.platform)),data.assignment!]);setAssignmentDraft(current=>({...current,external_branch_id:""}));}catch(reason){setError(reason instanceof Error?reason.message:"Branch mapping could not be saved.");}finally{setBusy(false);}};
  const removeAssignment=async(id:string)=>{setBusy(true);try{await assignmentCall({action:"delete",id});setAssignments(current=>current.map(row=>row.id===id?{...row,active:false}:row));}catch(reason){setError(reason instanceof Error?reason.message:"Branch mapping could not be removed.");}finally{setBusy(false);}};
  const input = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 13px",
    fontSize: 13,
    color: "var(--text)",
    fontFamily: "inherit",
    minHeight: 44,
  };
  return (
    <div style={{ maxWidth: 580 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
        {t("settingsTabs.locations.heading")}
      </h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 24px", lineHeight: 1.7 }}>
        {t("settingsTabs.locations.description")}
      </p>
      {error && (
        <div role="alert" style={{ fontSize: 12.5, color: "#B42318", marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          Loading locations…
        </div>
      )}
      {!loading && !outlets.length && !adding && (
        <div style={{ fontSize: 13, color: "var(--muted)", padding: "4px 0 18px" }}>
          No locations added yet.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {outlets.map((outlet) => (
          <div
            key={outlet.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 18px",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{outlet.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {outlet.city} · {outlet.region}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggle(outlet)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  padding: "6px 9px",
                  background: outlet.active ? "rgba(16,185,129,.08)" : "transparent",
                  color: outlet.active ? "#10B981" : "var(--muted)",
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {outlet.active
                  ? t("settingsTabs.locations.status.active")
                  : t("settingsTabs.locations.status.inactive")}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove ${outlet.name}`}
                onClick={() => void remove(outlet.id)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--muted)",
                  fontSize: 18,
                  minWidth: 44,
                  minHeight: 44,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      {adding ? (
        <div
          style={{
            background: "var(--surface2)",
            border: `1px solid ${OG}40`,
            borderRadius: 12,
            padding: "18px 20px",
            display: "grid",
            gap: 12,
          }}
        >
          <input
            aria-label="Location name"
            placeholder={t("settingsTabs.locations.namePlaceholder")}
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            style={input}
          />
          <input
            aria-label="POS branch identifier"
            placeholder="POS branch ID (for example DOHA-01)"
            value={draft.external_id}
            onChange={(event) => setDraft((current) => ({ ...current, external_id: event.target.value }))}
            style={input}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <select
              aria-label="Region"
              value={draft.region}
              onChange={(event) =>
                setDraft((current) => ({ ...current, region: event.target.value, city: "" }))
              }
              style={{ ...input, flex: 1 }}
            >
              {REGIONS.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
            <select
              aria-label="City"
              value={draft.city}
              onChange={(event) =>
                setDraft((current) => ({ ...current, city: event.target.value }))
              }
              style={{ ...input, flex: 1 }}
            >
              <option value="">{t("settingsTabs.locations.selectCity")}</option>
              {(CITIES[draft.region] ?? []).map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              disabled={busy || !draft.name.trim() || !draft.city}
              onClick={() => void add()}
              style={{
                flex: 1,
                background: OG,
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: 10,
                fontFamily: "inherit",
                fontWeight: 700,
                opacity: busy || !draft.name.trim() || !draft.city ? 0.6 : 1,
              }}
            >
              {busy ? "Saving…" : t("settingsTabs.locations.addOutlet")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAdding(false)}
              style={{
                flex: 1,
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                fontFamily: "inherit",
              }}
            >
              {t("settingsTabs.locations.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => setAdding(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "1px dashed var(--border)",
            borderRadius: 10,
            padding: "12px 20px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 18 }}>+</span>
          {t("settingsTabs.locations.addOutlet")}
        </button>
      )}
      {!!outlets.length&&<div style={{marginTop:24,borderTop:"1px solid var(--border)",paddingTop:20}}><h3 style={{fontSize:14,margin:"0 0 5px"}}>Branch channel identities</h3><p style={{fontSize:12,color:"var(--muted)",lineHeight:1.55,margin:"0 0 12px"}}>Link each internal branch to the ID used by a delivery platform. This keeps orders, payouts and profitability on one branch identity.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.2fr auto",gap:8}}><select aria-label="Restaurant branch" style={input} value={assignmentDraft.branch_id} onChange={event=>setAssignmentDraft(current=>({...current,branch_id:event.target.value}))}>{outlets.filter(row=>row.active).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select><select aria-label="Delivery platform" style={input} value={assignmentDraft.channel} onChange={event=>setAssignmentDraft(current=>({...current,channel:event.target.value}))}>{["snoonu","talabat","deliveroo","keeta","rafeeq","jahez","hungerstation"].map(row=><option key={row} value={row}>{row[0].toUpperCase()+row.slice(1)}</option>)}</select><input aria-label="Platform branch ID" style={input} placeholder="Platform branch ID" value={assignmentDraft.external_branch_id} onChange={event=>setAssignmentDraft(current=>({...current,external_branch_id:event.target.value}))}/><button type="button" disabled={busy||!assignmentDraft.external_branch_id.trim()} onClick={()=>void saveAssignment()} style={{border:0,borderRadius:8,padding:"0 13px",background:OG,color:"#fff",fontWeight:700}}>Link</button></div><div style={{display:"grid",gap:7,marginTop:12}}>{assignments.filter(row=>row.active).map(row=><div key={row.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 11px",background:"var(--surface2)",borderRadius:8,fontSize:12}}><span><b>{outlets.find(outlet=>outlet.id===row.branch_id)?.name??"Branch"}</b> · {row.platform} · <code>{row.external_branch_id}</code></span><button type="button" disabled={busy} onClick={()=>void removeAssignment(row.id)} style={{border:0,background:"transparent",color:"#B42318",cursor:"pointer"}}>Deactivate</button></div>)}</div></div>}
    </div>
  );
}
