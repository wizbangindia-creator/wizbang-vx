import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Check } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = (c) => `email=${encodeURIComponent(c.email)}&password=${encodeURIComponent(c.password)}`;
const errMsg = (e) => e?.response?.data?.detail || e.message || "Something went wrong";
const DEFAULT_HEADINGS = ["Date", "Name", "Phone", "Email", "City", "Preferred Branch", "Country", "Campaign"];
const norm = (v) => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const SYNONYMS = {
  date: ["date", "createdtime", "timestamp", "submittedat", "createdat"],
  name: ["fullname", "name", "studentname"],
  phone: ["phonenumber", "phone", "mobile", "mobilenumber", "contactnumber"],
  email: ["email", "emailaddress"],
  campaign: ["campaignname", "campaign"],
};
const guessColumn = (heading, headers) => {
  const key = norm(heading);
  for (const syn of SYNONYMS[key] || [key]) {
    const hit = headers.find((h) => norm(h) === syn);
    if (hit) return hit;
  }
  return headers.find((h) => norm(h).includes(key)) || "";
};
const sheetKey = (url) => (url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || [])[1] || "";

export function Shell({ title, onClose, children }) {
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

function TabPicker({ tabs, gid, connected, onPick }) {
  return (
    <div className="mb-6" data-testid="sheet-tab-picker">
      <p className="text-sm font-semibold text-slate-900 mb-2">Which tab do you want to connect?</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {tabs.map((t) => {
          const taken = connected.includes(t.gid);
          const active = t.gid === gid;
          return (
            <button key={t.gid} type="button" disabled={taken} onClick={() => onPick(t)}
              className={`flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${active ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 hover:bg-slate-50"} disabled:opacity-50 disabled:cursor-not-allowed`}
              data-testid={`sheet-tab-option-${t.gid}`}>
              <span className="truncate" title={t.name}>{t.name}</span>
              {taken ? <span className="text-xs text-slate-500 shrink-0">Connected</span> : active && <Check size={16} className="shrink-0 text-blue-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SheetModal({ credentials, sheet, connectedSheets, onClose, onSaved }) {
  const isNew = !sheet;
  const [url, setUrl] = useState(sheet?.spreadsheet_url || "");
  const [tabs, setTabs] = useState([]);
  const [tab, setTab] = useState(sheet ? { gid: sheet.gid, name: sheet.tab_name } : null);
  const [label, setLabel] = useState(sheet?.label || "");
  const [columns, setColumns] = useState(sheet?.columns || DEFAULT_HEADINGS.map((h) => ({ heading: h, sheet_column: "" })));
  const [roles, setRoles] = useState({ phone_col: sheet?.phone_col ?? 2, name_col: sheet?.name_col ?? 1, branch_col: sheet?.branch_col ?? 5, online_branch_col: sheet?.online_branch_col ?? -1 });
  const [auto, setAuto] = useState(sheet?.auto_sync_enabled ?? false);
  const [interval, setIntervalMin] = useState(sheet?.sync_interval_minutes ?? 15);
  const [headers, setHeaders] = useState([]);
  const [sendExisting, setSendExisting] = useState(false);
  const [busy, setBusy] = useState(false);

  const connected = connectedSheets
    .filter((s) => s.campaign_sheet_id !== sheet?.campaign_sheet_id && sheetKey(s.spreadsheet_url) === sheetKey(url))
    .map((s) => s.gid);

  const findTabs = useCallback(async (sheetUrl) => {
    if (!sheetUrl) return;
    setBusy(true);
    try {
      const res = await axios.get(`${API}/dashboard/campaign-sheet/tabs?${auth(credentials)}&sheet_url=${encodeURIComponent(sheetUrl)}`);
      setTabs(res.data.tabs);
    } catch (e) { toast.error(errMsg(e)); setTabs([]); }
    setBusy(false);
  }, [credentials]);

  const loadHeaders = useCallback(async (gid) => {
    setBusy(true);
    try {
      const tabUrl = `https://docs.google.com/spreadsheets/d/${sheetKey(url)}/edit#gid=${gid}`;
      const res = await axios.post(`${API}/dashboard/sheets/preview?${auth(credentials)}&sheet_url=${encodeURIComponent(tabUrl)}&sample_size=3`);
      setHeaders(res.data.headers);
      setColumns((cols) => cols.map((c) => (c.sheet_column && res.data.headers.includes(c.sheet_column)) ? c : { ...c, sheet_column: guessColumn(c.heading, res.data.headers) }));
      toast.success(`Found ${res.data.headers.length} columns, ${res.data.total_rows} rows`);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }, [credentials, url]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (sheet) { findTabs(sheet.spreadsheet_url); loadHeaders(sheet.gid); } }, []);

  const pickTab = (t) => {
    if (!label || label === tab?.name) setLabel(t.name);
    setTab(t);
    loadHeaders(t.gid);
  };

  const setCol = (i, key, val) => setColumns(columns.map((c, j) => (j === i ? { ...c, [key]: val } : c)));

  const save = async () => {
    if (!tab) { toast.error("Choose a tab first"); return; }
    if (!columns.some((c) => c.sheet_column)) { toast.error("Map at least one sheet column"); return; }
    setBusy(true);
    try {
      const body = { spreadsheet_url: url, gid: tab.gid, tab_name: tab.name || "", label, columns, ...roles, auto_sync_enabled: auto, sync_interval_minutes: Number(interval) || 15 };
      const res = isNew
        ? await axios.post(`${API}/dashboard/campaign-sheets?${auth(credentials)}`, body)
        : await axios.put(`${API}/dashboard/campaign-sheets/${sheet.campaign_sheet_id}?${auth(credentials)}`, body);
      toast.success(isNew ? "Sheet connected" : "Sheet settings saved");
      onSaved(res.data, isNew || !sheet.last_sync, sendExisting);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  const roleSelect = (key, text, allowNone = false) => (
    <label className="text-sm">
      <span className="block text-slate-600 mb-1">{text}</span>
      <select value={roles[key]} onChange={(e) => setRoles({ ...roles, [key]: Number(e.target.value) })} className="w-full min-w-0 truncate px-3 py-2 border border-slate-200 rounded-lg" data-testid={`role-${key}`}>
        {allowNone && <option value={-1}>— none —</option>}
        {columns.map((c, i) => <option key={i} value={i}>{i + 1}. {c.heading || `Column ${i + 1}`}</option>)}
      </select>
    </label>
  );

  return (
    <Shell title={isNew ? "Connect a Google Sheet" : `Edit · ${sheet.label}`} onClose={onClose}>
      <p className="text-sm text-slate-500 mb-4">Share the sheet as "Anyone with the link can view", paste the link, then choose the tab to read.</p>
      <div className="flex gap-2 mb-6">
        <input value={url} onChange={(e) => { setUrl(e.target.value); setTabs([]); setTab(null); setHeaders([]); }} placeholder="https://docs.google.com/spreadsheets/d/…" className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg" data-testid="campaign-sheet-url-input" />
        <button onClick={() => findTabs(url)} disabled={busy || !url} className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50" data-testid="campaign-sheet-find-tabs-btn">Find tabs</button>
      </div>

      {tabs.length > 0 && <TabPicker tabs={tabs} gid={tab?.gid} connected={connected} onPick={pickTab} />}

      {tab && (
        <>
          <label className="block text-sm mb-6">
            <span className="block text-slate-600 mb-1">Name shown in the dashboard</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tab.name} className="w-full px-3 py-2 border border-slate-200 rounded-lg" data-testid="campaign-sheet-label-input" />
          </label>

          <p className="text-sm font-semibold text-slate-900 mb-2">8 table columns — set the heading and pick the sheet column</p>
          <div className="space-y-2 mb-6">
            {columns.map((c, i) => (
              <div key={i} className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center">
                <span className="text-xs text-slate-400 font-mono">{i + 1}</span>
                <input value={c.heading} onChange={(e) => setCol(i, "heading", e.target.value)} placeholder="Heading" className="w-full min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm" data-testid={`campaign-heading-${i}`} />
                <select value={c.sheet_column} onChange={(e) => setCol(i, "sheet_column", e.target.value)} className="w-full min-w-0 truncate px-3 py-2 border border-slate-200 rounded-lg text-sm" data-testid={`campaign-mapping-${i}`}>
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
          {(isNew || !sheet.last_sync) && (
            <label className="flex items-start gap-2 text-sm mb-6 bg-amber-50 text-amber-800 rounded-lg p-3">
              <input type="checkbox" className="mt-0.5" checked={sendExisting} onChange={(e) => setSendExisting(e.target.checked)} data-testid="campaign-send-existing-toggle" />
              Also send WhatsApp to rows already in this tab. Leave this off to message only rows added after connecting.
            </label>
          )}
        </>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
        <button onClick={save} disabled={busy || !tab} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50" data-testid="campaign-sheet-save-btn">
          {isNew || !sheet.last_sync ? "Save & import" : "Save"}
        </button>
      </div>
    </Shell>
  );
}
