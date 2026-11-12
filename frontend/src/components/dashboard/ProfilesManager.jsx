import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = (c) => `email=${encodeURIComponent(c.email)}&password=${encodeURIComponent(c.password)}`;
const img = (u) => (u?.startsWith("/api/") ? `${process.env.REACT_APP_BACKEND_URL}${u}` : u);

const KINDS = {
  team: {
    title: "Team members",
    hint: "Shown on the About page. Use designation containing 'Founder' to set Mr. Sunil Arora / Mr. Rajesh Joshi photos.",
    fields: [["name", "Name"], ["designation", "Designation"]],
    sub: (p) => p.designation,
  },
  testimonials: {
    title: "Student testimonials",
    hint: "Shown in the sliding section on the homepage and on /student-stories.",
    fields: [["name", "Student name"], ["country", "Country they went to"], ["review", "Their review"]],
    sub: (p) => p.country,
  },
};

export default function ProfilesManager({ credentials, kind }) {
  const cfg = KINDS[kind];
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/dashboard/profiles/${kind}?${auth(credentials)}`);
      setItems(r.data.items);
    } catch (e) { toast.error("Could not load"); }
  }, [credentials, kind]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => { await axios.patch(`${API}/dashboard/profiles/${kind}/${id}/toggle?${auth(credentials)}`); load(); };
  const remove = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await axios.delete(`${API}/dashboard/profiles/${kind}/${id}?${auth(credentials)}`);
    load();
  };

  return (
    <div className="space-y-6" data-testid={`profiles-${kind}`}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{cfg.title} <span className="text-slate-400 font-normal">({items.length})</span></p>
          <p className="text-xs text-slate-500 mt-1">{cfg.hint}</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm w-fit" data-testid={`add-${kind}-btn`}>
          <Plus size={15} /> Add
        </button>
      </div>
      {items.length === 0 && <p className="text-center text-slate-400 py-12" data-testid={`${kind}-empty`}>Nothing added yet</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <div key={p.profile_id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${p.is_active ? "" : "opacity-50"}`} data-testid={`${kind}-item-${p.profile_id}`}>
            <img src={img(p.image_url)} alt={p.name} className="w-full h-44 object-cover bg-slate-100" />
            <div className="p-4">
              <p className="font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">{cfg.sub(p)}</p>
              {p.review && <p className="text-xs text-slate-600 mt-2 line-clamp-3">"{p.review}"</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggle(p.profile_id)} className="p-1.5 text-slate-500 hover:text-blue-600" title={p.is_active ? "Hide" : "Show"} data-testid={`${kind}-toggle-${p.profile_id}`}>
                  {p.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => remove(p.profile_id)} className="p-1.5 text-slate-500 hover:text-red-600" title="Delete" data-testid={`${kind}-delete-${p.profile_id}`}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {adding && <AddProfileModal credentials={credentials} kind={kind} cfg={cfg} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function AddProfileModal({ credentials, kind, cfg, onClose, onSaved }) {
  const [values, setValues] = useState({});
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!file || cfg.fields.some(([k]) => !(values[k] || "").trim())) { toast.error("Please add a photo and fill every field"); return; }
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    try {
      await axios.post(`${API}/dashboard/profiles/${kind}?${auth(credentials)}`, fd);
      toast.success("Added");
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Upload failed"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400"><X size={20} /></button>
        <h3 className="text-lg font-bold text-slate-900">Add {kind === "team" ? "team member" : "student testimonial"}</h3>
        <label className="block text-sm">
          <span className="text-slate-600">Photo (JPG/PNG/WebP, under 5MB)</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="mt-1 block w-full text-sm" data-testid={`${kind}-file-input`} />
        </label>
        {cfg.fields.map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="text-slate-600">{label}</span>
            {k === "review" ? (
              <textarea rows={4} value={values[k] || ""} onChange={(e) => setValues({ ...values, [k]: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg" data-testid={`${kind}-${k}-input`} />
            ) : (
              <input value={values[k] || ""} onChange={(e) => setValues({ ...values, [k]: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg" data-testid={`${kind}-${k}-input`} />
            )}
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50" data-testid={`${kind}-save-btn`}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
