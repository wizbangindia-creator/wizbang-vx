import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Search, RefreshCw, Trash2, Send, FileSpreadsheet, MessageCircle, ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";
import { Shell, SheetModal } from "./CampaignSheetModal";

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
  duplicate: "bg-sky-100 text-sky-700",
  invalid: "bg-orange-100 text-orange-700",
};

function WaBadge({ wa }) {
  if (!wa) return <span className="text-xs text-slate-400">Pending</span>;
  return (
    <span title={wa.error || wa.template} className={`text-xs px-2 py-0.5 rounded-full font-medium ${WA_STYLE[wa.status] || WA_STYLE.skipped}`}>
      {wa.status}{wa.template ? ` · ${wa.template}` : ""}
    </span>
  );
}

function SheetsPanel({ sheets, syncingId, onSync, onEdit, onRemove }) {
  if (sheets.length === 0) {
    return <p className="text-sm text-slate-400 px-1" data-testid="campaign-sheets-empty">No sheets connected yet. Click "Connect sheet" to add one.</p>;
  }
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="campaign-sheets-list">
      {sheets.map((s) => (
        <div key={s.campaign_sheet_id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2" data-testid={`campaign-sheet-card-${s.campaign_sheet_id}`}>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate" title={s.label}>{s.label}</p>
            {s.tab_name && s.tab_name !== s.label && <p className="text-xs text-slate-500 truncate">Tab: {s.tab_name}</p>}
            <p className="text-xs text-slate-500">
              {s.last_sync ? `Synced ${new Date(s.last_sync).toLocaleString()} · ${s.last_sync_result}` : "Not synced yet"}
              {s.auto_sync_enabled && ` · Auto every ${s.sync_interval_minutes} min`}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => onSync(s)} disabled={!!syncingId} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-xs disabled:opacity-50" data-testid={`campaign-sheet-sync-${s.campaign_sheet_id}`}>
              <RefreshCw size={13} className={syncingId === s.campaign_sheet_id ? "animate-spin" : ""} /> Sync
            </button>
            <button onClick={() => onEdit(s)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs hover:bg-slate-50" data-testid={`campaign-sheet-edit-${s.campaign_sheet_id}`}>
              <Pencil size={13} /> Edit
            </button>
            <button onClick={() => onRemove(s)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs text-red-600 hover:bg-red-50" data-testid={`campaign-sheet-remove-${s.campaign_sheet_id}`}>
              <Trash2 size={13} /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CampaignLeadsManager({ credentials }) {
  const [data, setData] = useState({ headings: [], items: [], total: 0 });
  const [sheets, setSheets] = useState([]);
  const [sheetFilter, setSheetFilter] = useState("");
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(1);
  const [syncingId, setSyncingId] = useState("");
  const [editing, setEditing] = useState(undefined);
  const [showRoutes, setShowRoutes] = useState(false);
  const perPage = 20;

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/dashboard/campaign-leads?${auth(credentials)}&page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}&branch=${branch}&sheet_id=${sheetFilter}`);
      setData(res.data);
    } catch (e) { toast.error(errMsg(e)); }
  }, [credentials, page, search, branch, sheetFilter]);

  const loadSheets = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/dashboard/campaign-sheets?${auth(credentials)}`);
      setSheets(res.data.sheets);
    } catch (e) { toast.error(errMsg(e)); }
  }, [credentials]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSheets(); }, [loadSheets]);

  const syncSheet = async (s, sendToExisting = false) => {
    setSyncingId(s.campaign_sheet_id);
    try {
      const res = await axios.post(`${API}/dashboard/campaign-sheets/${s.campaign_sheet_id}/sync?${auth(credentials)}`, { send_to_existing: sendToExisting });
      toast.success(res.data.message);
    } catch (e) { toast.error(errMsg(e)); }
    setSyncingId("");
    await Promise.all([load(), loadSheets()]);
  };

  const syncAll = async () => {
    setSyncingId("all");
    try {
      const res = await axios.post(`${API}/dashboard/campaign-sheets/sync-all?${auth(credentials)}`);
      toast.success(res.data.message);
    } catch (e) { toast.error(errMsg(e)); }
    setSyncingId("");
    await Promise.all([load(), loadSheets()]);
  };

  const removeSheet = async (s) => {
    if (!window.confirm(`Disconnect "${s.label}"? Its imported leads will also be removed from this list.`)) return;
    try {
      await axios.delete(`${API}/dashboard/campaign-sheets/${s.campaign_sheet_id}?${auth(credentials)}`);
      if (sheetFilter === s.campaign_sheet_id) setSheetFilter("");
      loadSheets();
      load();
    } catch (e) { toast.error(errMsg(e)); }
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
  const showSheetCol = !sheetFilter && sheets.length > 1;

  return (
    <div className="space-y-6" data-testid="campaign-leads-tab">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><FileSpreadsheet size={20} /></div>
            <div>
              <p className="font-semibold text-slate-900" data-testid="campaign-sheet-status">
                {sheets.length ? `${sheets.length} Google Sheet${sheets.length === 1 ? "" : "s"} connected` : "No Google Sheet connected"}
              </p>
              <p className="text-xs text-slate-500">Connect as many sheets or tabs as you need — each is synced on its own.</p>
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
            <button onClick={() => setEditing(null)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50" data-testid="campaign-sheet-connect-btn">
              <Plus size={15} /> Connect sheet
            </button>
            <button onClick={syncAll} disabled={!!syncingId || sheets.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50" data-testid="campaign-sync-btn">
              <RefreshCw size={15} className={syncingId === "all" ? "animate-spin" : ""} /> {syncingId === "all" ? "Syncing…" : "Sync all"}
            </button>
          </div>
        </div>
        <SheetsPanel sheets={sheets} syncingId={syncingId} onSync={(s) => syncSheet(s)} onEdit={setEditing} onRemove={removeSheet} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search any column…" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" data-testid="campaign-search-input" />
        </div>
        {sheets.length > 1 && (
          <select value={sheetFilter} onChange={(e) => { setSheetFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-slate-200 rounded-lg max-w-xs" data-testid="campaign-sheet-filter">
            <option value="">All sheets</option>
            {sheets.map((s) => <option key={s.campaign_sheet_id} value={s.campaign_sheet_id}>{s.label}</option>)}
          </select>
        )}
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
              {showSheetCol && <th className="text-left font-semibold px-4 py-3">Sheet</th>}
              {data.headings.map((h, i) => <th key={i} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>)}
              <th className="text-left font-semibold px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr><td colSpan={data.headings.length + 3} className="text-center text-slate-400 py-12" data-testid="campaign-leads-empty">No campaign leads yet</td></tr>
            )}
            {data.items.map((l) => (
              <tr key={l.campaign_lead_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`campaign-lead-row-${l.campaign_lead_id}`}>
                {showSheetCol && <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap max-w-[160px] truncate" title={l.sheet_label}>{l.sheet_label || "—"}</td>}
                {l.values.map((v, i) => { const shown = i === data.phone_col && l.phone ? l.phone : v; return <td key={i} className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-[220px] truncate" title={v}>{shown || "—"}</td>; })}
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

      {editing !== undefined && (
        <SheetModal credentials={credentials} sheet={editing} connectedSheets={sheets} onClose={() => setEditing(undefined)}
          onSaved={async (saved, firstImport, sendExisting) => { setEditing(undefined); await loadSheets(); load(); if (firstImport) syncSheet(saved, sendExisting); }} />
      )}
      {showRoutes && <WaRoutesModal credentials={credentials} berlin={data.account === "berlin"} onClose={() => setShowRoutes(false)} />}
    </div>
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
