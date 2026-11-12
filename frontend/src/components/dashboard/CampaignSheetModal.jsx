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

function TabPicker({ tabs, picked, connected, multi, onPick, onPickAll }) {
  const free = tabs.filter((t) => !connected.includes(t.gid));
  return (
    <div className="mb-6" data-testid="sheet-tab-picker">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-900">{multi ? "Which tabs do you want to connect? Pick one or more." : "Which tab should this connection read?"}</p>
        {multi && free.length > 1 && (
          <button type="button" onClick={() => onPickAll(free)} className="text-xs text-blue-600 hover:underline" data-testid="sheet-tab-select-all">
            {free.every((t) => picked.some((p) => p.gid === t.gid)) ? "Clear all" : "Select all"}
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {tabs.map((t) => {
          const taken = connected.includes(t.gid);
          const active = picked.some((p) => p.gid === t.gid);
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
  const [title, setTitle] = useState(sheet?.spreadsheet_title || "");
  const [tabs, setTabs] = useState([]);
  const [picked, setPicked] = useState(sheet ? [{ gid: sheet.gid, name: sheet.tab_name }] : []);
  const [label, setLabel] = useState(sheet?.label || "");
  const [columns, setColumns] = useState(sheet?.columns || DEFAULT_HEADINGS.map((h) => ({ heading: h, sheet_column: "" })));
  const [roles, setRoles] = useState({ phone_col: sheet?.phone_col ?? 2, name_col: sheet?.name_col ?? 1, branch_col: sheet?.branch_col ?? 5, online_branch_col: sheet?.online_branch_col ?? -1 });
  const [auto, setAuto] = useState(sheet?.auto_sync_enabled ?? false);
  const [interval, setIntervalMin] = useState(sheet?.sync_interval_minutes ?? 15);
  const [headersByGid, setHeadersByGid] = useState({});
  const [sendExisting, setSendExisting] = useState(false);
  const [busy, setBusy] = useState(false);

  const connected = connectedSheets
    .filter((s) => s.campaign_sheet_id !== sheet?.campaign_sheet_id && sheetKey(s.spreadsheet_url) === sheetKey(url))
    .map((s) => s.gid);
  const headers = [...new Set(picked.flatMap((t) => headersByGid[t.gid] || []))];

  const findTabs = useCallback(async (sheetUrl) => {
    if (!sheetUrl) return;
    setBusy(true);
    try {
      const res = await axios.get(`${API}/dashboard/campaign-sheet/tabs?${auth(credentials)}&sheet_url=${encodeURIComponent(sheetUrl)}`);
      setTabs(res.data.tabs);
      setTitle(res.data.title || "");
    } catch (e) { toast.error(errMsg(e)); setTabs([]); }
    setBusy(false);
  }, [credentials]);

  const loadHeaders = useCallback(async (gid) => {
    setBusy(true);
    try {
      const tabUrl = `https://docs.google.com/spreadsheets/d/${sheetKey(url)}/edit#gid=${gid}`;
      const res = await axios.post(`${API}/dashboard/sheets/preview?${auth(credentials)}&sheet_url=${encodeURIComponent(tabUrl)}&sample_size=3`);
      const hs = res.data.headers;
      setHeadersByGid((m) => ({ ...m, [gid]: hs }));
      setColumns((cols) => cols.map((c) => (c.sheet_column ? c : { ...c, sheet_column: guessColumn(c.heading, hs) })));
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }, [credentials, url]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (sheet) { findTabs(sheet.spreadsheet_url); loadHeaders(sheet.gid); } }, []);

  const pickTab = (t) => {
    if (!isNew) {
      if (!label || label === picked[0]?.name) setLabel(t.name);
      setPicked([t]);
    } else if (picked.some((p) => p.gid === t.gid)) {
      setPicked(picked.filter((p) => p.gid !== t.gid));
      return;
    } else {
      setPicked([...picked, t]);
    }
    if (!headersByGid[t.gid]) loadHeaders(t.gid);
  };

  const pickAll = (free) => {
    if (free.every((t) => picked.some((p) => p.gid === t.gid))) { setPicked([]); return; }
    setPicked(free);
    free.filter((t) => !headersByGid[t.gid]).forEach((t) => loadHeaders(t.gid));
  };

  const setCol = (i, key, val) => setColumns(columns.map((c, j) => (j === i ? { ...c, [key]: val } : c)));

  const save = async () => {
    if (!picked.length) { toast.error("Choose at least one tab"); return; }
    if (!columns.some((c) => c.sheet_column)) { toast.error("Map at least one sheet column"); return; }
    setBusy(true);
    const base = { spreadsheet_url: url, spreadsheet_title: title, columns, ...roles, auto_sync_enabled: auto, sync_interval_minutes: Number(interval) || 15 };
    try {
      if (!isNew) {
        const t = picked[0];
        const res = await axios.put(`${API}/dashboard/campaign-sheets/${sheet.campaign_sheet_id}?${auth(credentials)}`, { ...base, gid: t.gid, tab_name: t.name || "", label });
        toast.success("Sheet settings saved");
        onSaved([res.data], !sheet.last_sync, sendExisting);
      } else {
        const saved = [];
        for (const t of picked) {
          try {
            const res = await axios.post(`${API}/dashboard/campaign-sheets?${auth(credentials)}`, { ...base, gid: t.gid, tab_name: t.name || "", label: picked.length === 1 ? label : t.name });
            saved.push(res.data);
          } catch (e) { toast.error(`${t.name}: ${errMsg(e)}`); }
        }
        if (saved.length) toast.success(`${saved.length} tab${saved.length === 1 ? "" : "s"} connected`);
        onSaved(saved, true, sendExisting);
      }
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
      <p className="text-sm text-slate-500 mb-4">Share the sheet as "Anyone with the link can view", paste the link, then choose one or more tabs.</p>
      <div className="flex gap-2 mb-6">
        <input value={url} onChange={(e) => { setUrl(e.target.value); setTabs([]); setPicked([]); setTitle(""); }} placeholder="https://docs.google.com/spreadsheets/d/…" className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg" data-testid="campaign-sheet-url-input" />
        <button onClick={() => findTabs(url)} disabled={busy || !url} className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50" data-testid="campaign-sheet-find-tabs-btn">Find tabs</button>
      </div>

      {title && tabs.length > 0 && <p className="text-xs text-slate-500 mb-2" data-testid="campaign-spreadsheet-title">Spreadsheet: <span className="font-medium text-slate-700">{title}</span></p>}
      {tabs.length > 0 && <TabPicker tabs={tabs} picked={picked} connected={connected} multi={isNew} onPick={pickTab} onPickAll={pickAll} />}

      {picked.length > 0 && (
        <>
          {picked.length === 1 ? (
          <label className="block text-sm mb-6">
            <span className="block text-slate-600 mb-1">Name shown in the dashboard</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={picked[0].name} className="w-full px-3 py-2 border border-slate-200 rounded-lg" data-testid="campaign-sheet-label-input" />
          </label>
          ) : (
            <p className="text-sm text-slate-600 mb-6" data-testid="campaign-picked-count">{picked.length} tabs selected — each is connected separately and named after its tab. The column mapping below is used for all of them.</p>
          )}

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
              Also send WhatsApp to rows already in the selected tab(s). Leave this off to message only rows added after connecting.
            </label>
          )}
        </>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
        <button onClick={save} disabled={busy || !picked.length} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50" data-testid="campaign-sheet-save-btn">
          {isNew ? (picked.length > 1 ? `Connect ${picked.length} tabs & import` : "Save & import") : !sheet.last_sync ? "Save & import" : "Save"}
        </button>
      </div>
    </Shell>
  );
}
