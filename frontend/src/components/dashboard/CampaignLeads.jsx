import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Search, RefreshCw, Link, Trash2, Send, X, FileSpreadsheet, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = (c) => `email=${encodeURIComponent(c.email)}&password=${encodeURIComponent(c.password)}`;
const errMsg = (e) => e?.response?.data?.detail || e.message || "Something went wrong";

const BRANCHES = [
  { key: "", label: "All branches" },
  { key: "jammu", label: "Jammu" },
  { key: "pathankot", label: "Pathankot" },
  { key: "ludhiana", label: "Ludhiana" },
  { key: "amritsar", label: "Amritsar" },
  { key: "online", label: "Online" },
  { key: "none", label: "No branch match" },
];

const WA_STYLE = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-slate-100 text-slate-500",
  queued: "bg-amber-100 text-amber-700",
};

function WaBadge({ wa }) {
  if (!wa) return <span className="text-xs text-slate-400">Pending</span>;
  return (
    <span title={wa.error || wa.template} className={`text-xs px-2 py-0.5 rounded-full font-medium ${WA_STYLE[wa.status] || WA_STYLE.skipped}`}>
      {wa.status}{wa.template ? ` · ${wa.template}` : ""}
    </span>
  );
}

export default function CampaignLeadsManager({ credentials }) {
  const [data, setData] = useState({ headings: [], items: [], total: 0 });
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const perPage = 20;

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/dashboard/campaign-leads?${auth(credentials)}&page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}&branch=${branch}`);
      setData(res.data);
    } catch (e) { toast.error(errMsg(e)); }
  }, [credentials, page, search, branch]);

  const loadSettings = useCallback(async () => {
    const res = await axios.get(`${API}/dashboard/campaign-sheet/settings?${auth(credentials)}`);
    setSettings(res.data);
  }, [credentials]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  const syncNow = async (sendToExisting = false) => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/dashboard/campaign-sheet/sync?${auth(credentials)}`, { send_to_existing: sendToExisting });
      toast.success(res.data.message);
      await Promise.all([load(), loadSettings()]);
    } catch (e) { toast.error(errMsg(e)); }
    setSyncing(false);
  };

  const resend = async (id) => {
    try {
      const res = await axios.post(`${API}/dashboard/campaign-leads/${id}/resend?${auth(credentials)}`);
      res.data.success ? toast.success("WhatsApp sent") : toast.error(res.data.error || "Send failed");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const sendSkipped = async () => {
    const n = data.skipped_count;
    if (!window.confirm(`Send WhatsApp to ${n} skipped lead${n === 1 ? "" : "s"} now?`)) return;
    try {
      const res = await axios.post(`${API}/dashboard/campaign-leads/send-skipped?${auth(credentials)}`);
      toast.success(`Sending to ${res.data.queued} lead${res.data.queued === 1 ? "" : "s"} — statuses update in a moment`);
      load();
      setTimeout(load, Math.min(4000 + res.data.queued * 600, 30000));
    } catch (e) { toast.error(errMsg(e)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this campaign lead?")) return;
    try {
      await axios.delete(`${API}/dashboard/campaign-leads/${id}?${auth(credentials)}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const pages = Math.max(1, Math.ceil(data.total / perPage));

  return (
    <div className="space-y-6" data-testid="campaign-leads-tab">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><FileSpreadsheet size={20} /></div>
          <div>
            <p className="font-semibold text-slate-900" data-testid="campaign-sheet-status">
              {settings?.configured ? "Google Sheet connected" : "No Google Sheet connected"}
            </p>
            <p className="text-xs text-slate-500">
              {settings?.last_sync ? `Last sync ${new Date(settings.last_sync).toLocaleString()} · ${settings.last_sync_result}` : "Connect a sheet and map its columns to start"}
              {settings?.auto_sync_enabled && ` · Auto-sync every ${settings.sync_interval_minutes} min`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.skipped_count > 0 && (
            <button onClick={sendSkipped} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700" data-testid="send-skipped-btn">
              <Send size={15} /> Send all skipped ({data.skipped_count})
            </button>
          )}
          <button onClick={() => setShowRoutes(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50" data-testid="wa-routes-btn">
            <MessageCircle size={15} /> WhatsApp templates
          </button>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50" data-testid="campaign-sheet-settings-btn">
            <Link size={15} /> {settings?.configured ? "Sheet & columns" : "Connect sheet"}
          </button>
          <button onClick={() => syncNow(false)} disabled={syncing || !settings?.configured} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50" data-testid="campaign-sync-btn">
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search any column…" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" data-testid="campaign-search-input" />
        </div>
        {data.account !== "berlin" && (
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-slate-200 rounded-lg" data-testid="campaign-branch-filter">
            {BRANCHES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm" data-testid="campaign-leads-table">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {data.headings.map((h, i) => <th key={i} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>)}
              <th className="text-left font-semibold px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr><td colSpan={data.headings.length + 2} className="text-center text-slate-400 py-12" data-testid="campaign-leads-empty">No campaign leads yet</td></tr>
            )}
            {data.items.map((l) => (
              <tr key={l.campaign_lead_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`campaign-lead-row-${l.campaign_lead_id}`}>
                {l.values.map((v, i) => <td key={i} className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-[220px] truncate" title={v}>{v || "—"}</td>)}
                <td className="px-4 py-3 whitespace-nowrap"><WaBadge wa={l.whatsapp} /></td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button onClick={() => resend(l.campaign_lead_id)} className="p-1.5 text-slate-500 hover:text-green-600" title="Send WhatsApp again" data-testid={`campaign-resend-${l.campaign_lead_id}`}><Send size={15} /></button>
                  <button onClick={() => remove(l.campaign_lead_id)} className="p-1.5 text-slate-500 hover:text-red-600" title="Delete" data-testid={`campaign-delete-${l.campaign_lead_id}`}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
          <span data-testid="campaign-leads-total">{data.total} campaign leads</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-slate-200 disabled:opacity-40" data-testid="campaign-prev-page"><ChevronLeft size={16} /></button>
            <span>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-slate-200 disabled:opacity-40" data-testid="campaign-next-page"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {showSettings && settings && (
        <CampaignSheetSettings credentials={credentials} settings={settings} onClose={() => setShowSettings(false)}
          onSaved={async (firstConnect, sendExisting) => { setShowSettings(false); await loadSettings(); load(); if (firstConnect) syncNow(sendExisting); }} />
      )}
      {showRoutes && <WaRoutesModal credentials={credentials} berlin={data.account === "berlin"} onClose={() => setShowRoutes(false)} />}
    </div>
  );
}

function Shell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" data-testid="modal-close-btn"><X size={22} /></button>
        <h3 className="text-xl font-bold text-slate-900 mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function CampaignSheetSettings({ credentials, settings, onClose, onSaved }) {
  const [url, setUrl] = useState(settings.sheet_url);
  const [columns, setColumns] = useState(settings.columns);
  const [roles, setRoles] = useState({ phone_col: settings.phone_col, name_col: settings.name_col, branch_col: settings.branch_col, online_branch_col: settings.online_branch_col ?? -1 });
  const [auto, setAuto] = useState(settings.auto_sync_enabled);
  const [interval, setIntervalMin] = useState(settings.sync_interval_minutes);
  const [headers, setHeaders] = useState([]);
  const [sendExisting, setSendExisting] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadHeaders = useCallback(async (sheetUrl) => {
    if (!sheetUrl) return false;
    setBusy(true);
    let ok = false;
    try {
      const res = await axios.post(`${API}/dashboard/sheets/preview?${auth(credentials)}&sheet_url=${encodeURIComponent(sheetUrl)}&sample_size=3`);
      setHeaders(res.data.headers);
      setColumns((cols) => cols.map((c) => c.sheet_column ? c : { ...c, sheet_column: res.data.headers.find((h) => h.toLowerCase().includes(c.heading.toLowerCase().split(" ").pop())) || "" }));
      toast.success(`Found ${res.data.headers.length} columns, ${res.data.total_rows} rows`);
      ok = true;
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
    return ok;
  }, [credentials]);

  useEffect(() => { if (settings.sheet_url) loadHeaders(settings.sheet_url); }, [settings.sheet_url, loadHeaders]);

  const setCol = (i, key, val) => setColumns(columns.map((c, j) => (j === i ? { ...c, [key]: val } : c)));

  const save = async () => {
    if (headers.length === 0 && !(await loadHeaders(url))) return;
    if (!columns.some((c) => c.sheet_column)) { toast.error("Map at least one sheet column"); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/dashboard/campaign-sheet/settings?${auth(credentials)}`, {
        sheet_url: url, columns, ...roles, auto_sync_enabled: auto, sync_interval_minutes: Number(interval) || 15,
      });
      toast.success("Sheet settings saved");
      onSaved(!settings.last_sync, sendExisting);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  const roleSelect = (key, label, allowNone = false) => (
    <label className="text-sm">
      <span className="block text-slate-600 mb-1">{label}</span>
      <select value={roles[key]} onChange={(e) => setRoles({ ...roles, [key]: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" data-testid={`role-${key}`}>
        {allowNone && <option value={-1}>— none —</option>}
        {columns.map((c, i) => <option key={i} value={i}>{i + 1}. {c.heading || `Column ${i + 1}`}</option>)}
      </select>
    </label>
  );

  return (
    <Shell title="Campaign leads · Google Sheet" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-4">Share the sheet as "Anyone with the link can view". Paste the link of the exact tab you want to read.</p>
      <div className="flex gap-2 mb-6">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg" data-testid="campaign-sheet-url-input" />
        <button onClick={() => loadHeaders(url)} disabled={busy || !url} className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50" data-testid="campaign-sheet-load-btn">Load columns</button>
      </div>

      <p className="text-sm font-semibold text-slate-900 mb-2">8 table columns — set the heading and pick the sheet column</p>
      <div className="space-y-2 mb-6">
        {columns.map((c, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_1fr] gap-2 items-center">
            <span className="text-xs text-slate-400 font-mono">{i + 1}</span>
            <input value={c.heading} onChange={(e) => setCol(i, "heading", e.target.value)} placeholder="Heading" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" data-testid={`campaign-heading-${i}`} />
            <select value={c.sheet_column} onChange={(e) => setCol(i, "sheet_column", e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" data-testid={`campaign-mapping-${i}`}>
              <option value="">— not mapped —</option>
              {[...new Set([...headers, c.sheet_column].filter(Boolean))].map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {roleSelect("name_col", "Which column is the name?")}
        {roleSelect("phone_col", "Which column is the phone?")}
        {roleSelect("branch_col", "Which column is Preferred Branch?")}
        {roleSelect("online_branch_col", "For Online rows, which column has the branch?", true)}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} data-testid="campaign-auto-sync-toggle" /> Auto-sync new rows every</label>
        <input type="number" min={5} value={interval} onChange={(e) => setIntervalMin(e.target.value)} className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg" data-testid="campaign-sync-interval" /> minutes
      </div>
      {!settings.last_sync && (
        <label className="flex items-start gap-2 text-sm mb-6 bg-amber-50 text-amber-800 rounded-lg p-3">
          <input type="checkbox" className="mt-0.5" checked={sendExisting} onChange={(e) => setSendExisting(e.target.checked)} data-testid="campaign-send-existing-toggle" />
          Also send WhatsApp to rows already in the sheet. Leave this off to message only rows added after connecting.
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
        <button onClick={save} disabled={busy || !url} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50" data-testid="campaign-sheet-save-btn">
          {settings.last_sync ? "Save" : "Save & import"}
        </button>
      </div>
    </Shell>
  );
}

const ROUTE_LABELS = [
  ["website", "Website enquiries"],
  ["ivr", "IVR calls"],
  ["jammu", "Sheet · Jammu"],
  ["pathankot", "Sheet · Pathankot"],
  ["ludhiana", "Sheet · Ludhiana"],
  ["amritsar", "Sheet · Amritsar"],
  ["online", "Sheet · Online (no branch)"],
  ["online_jammu", "Sheet · Online + Jammu"],
  ["online_pathankot", "Sheet · Online + Pathankot"],
  ["online_amritsar", "Sheet · Online + Amritsar"],
  ["online_ludhiana", "Sheet · Online + Ludhiana"],
];
const BERLIN_ROUTES = [["berlin", "Berlin page & Berlin sheet"]];

function WaRoutesModal({ credentials, berlin, onClose }) {
  const [cfg, setCfg] = useState(null);
  const routes = berlin ? BERLIN_ROUTES : ROUTE_LABELS;

  useEffect(() => {
    axios.get(`${API}/dashboard/wa-routes?${auth(credentials)}`).then((r) => setCfg(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [credentials]);

  const save = async () => {
    try {
      await axios.post(`${API}/dashboard/wa-routes?${auth(credentials)}`, cfg);
      toast.success("WhatsApp templates saved");
      onClose();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <Shell title="Instant WhatsApp templates (AiSensy campaign names)" onClose={onClose}>
      {!cfg ? <p className="text-sm text-slate-500">Loading…</p> : (
        <>
          <div className="space-y-2 mb-5">
            {routes.map(([key, label]) => (
              <div key={key} className="grid grid-cols-[180px_1fr] gap-3 items-center">
                <span className="text-sm text-slate-600">{label}</span>
                <input value={cfg.templates[key] || ""} onChange={(e) => setCfg({ ...cfg, templates: { ...cfg.templates, [key]: e.target.value } })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" data-testid={`wa-route-${key}`} />
              </div>
            ))}
          </div>
          {!berlin && (
            <label className="flex items-center gap-2 text-sm mb-6">
              <input type="checkbox" checked={cfg.send_name_param} onChange={(e) => setCfg({ ...cfg, send_name_param: e.target.checked })} data-testid="wa-send-name-toggle" />
              Templates use the student's name as variable {"{{1}}"}
            </label>
          )}
          {cfg.key_hint && (
            <p className="text-xs text-slate-500 mb-4" data-testid="wa-key-hint">
              AiSensy key in use ends with <span className="font-mono font-semibold">{berlin ? cfg.key_hint.berlin : cfg.key_hint.india}</span> — it should match the key in AiSensy → Manage → API Key.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" data-testid="wa-routes-save-btn">Save</button>
          </div>
        </>
      )}
    </Shell>
  );
}
