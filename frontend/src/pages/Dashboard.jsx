import { useState, useEffect, useCallback } from "react";
import CampaignLeadsManager from "../components/dashboard/CampaignLeads";
import ProfilesManager from "../components/dashboard/ProfilesManager";
import axios from "axios";
import { toast } from "sonner";
import {
  Users,
  Globe,
  Search,
  Filter,
  Download,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Facebook,
  Chrome,
  Monitor,
  TrendingUp,
  Copy,
  Upload,
  FileSpreadsheet,
  Settings,
  X,
  Link,
  Zap,
  GraduationCap,
  Star,
  MessageSquare,
  Plus,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  Ticket,
  MessageCircle,
  Send,
  Edit3,
  Sparkles,
  Menu as MenuIcon,
  ChevronDown,
  MoreHorizontal,
  LayoutDashboard,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const sourceColors = {
  website: "bg-blue-100 text-blue-700",
  meta: "bg-purple-100 text-purple-700",
  google: "bg-green-100 text-green-700",
  google_sheets: "bg-emerald-100 text-emerald-700",
  university_change: "bg-teal-100 text-teal-700",
  germany_fair: "bg-amber-100 text-amber-700",
  ielts_celebration: "bg-rose-100 text-rose-700",
  ivr_missed_call: "bg-orange-100 text-orange-700",
  webhook: "bg-gray-100 text-gray-700",
};

const sourceIcons = {
  website: Monitor,
  meta: Facebook,
  google: Chrome,
  google_sheets: FileSpreadsheet,
  university_change: GraduationCap,
  germany_fair: Ticket,
  ielts_celebration: Sparkles,
  ivr_missed_call: Phone,
  webhook: Globe,
};

const statusColors = {
  new: "bg-yellow-100 text-yellow-700",
  contacted: "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
};

const statusIcons = {
  new: Clock,
  contacted: Phone,
  converted: CheckCircle2,
  closed: XCircle,
};

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [filters, setFilters] = useState({
    source: "",
    status: "",
    search: "",
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    google_sheets_url: "",
    auto_sync_enabled: false,
    last_sync: null,
    last_sync_result: null
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeduping, setIsDeduping] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");
  const [reviews, setReviews] = useState([]);
  const [showAddReview, setShowAddReview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Check for saved session
  useEffect(() => {
    const savedEmail = sessionStorage.getItem("dashboard_email");
    const savedPassword = sessionStorage.getItem("dashboard_password");
    const savedUserInfo = sessionStorage.getItem("dashboard_user_info");
    if (savedEmail && savedPassword) {
      setCredentials({ email: savedEmail, password: savedPassword });
      setIsAuthenticated(true);
      if (savedUserInfo) {
        setUserInfo(JSON.parse(savedUserInfo));
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Normalise inputs so stray spaces / auto-capitalised email don't block login
    const cleaned = {
      email: (credentials.email || "").trim(),
      password: (credentials.password || "").trim(),
    };

    try {
      const response = await axios.post(`${API}/dashboard/login`, cleaned);
      setCredentials(cleaned);
      setIsAuthenticated(true);
      setUserInfo(response.data.user);
      sessionStorage.setItem("dashboard_email", cleaned.email);
      sessionStorage.setItem("dashboard_password", cleaned.password);
      sessionStorage.setItem("dashboard_user_info", JSON.stringify(response.data.user));
      toast.success(`Welcome, ${response.data.user?.name || 'User'}!`);
    } catch (error) {
      if (error.response) {
        // Server responded (e.g. 401) — credentials were actually wrong
        toast.error(error.response?.data?.detail || "Invalid email or password");
      } else {
        // No response — network / server-unreachable / CORS issue
        toast.error("Couldn't reach the server. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCredentials({ email: "", password: "" });
    setUserInfo(null);
    sessionStorage.removeItem("dashboard_email");
    sessionStorage.removeItem("dashboard_password");
    sessionStorage.removeItem("dashboard_user_info");
    toast.success("Logged out successfully");
  };

  const getAuthParams = useCallback(() => {
    return `email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`;
  }, [credentials]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats?${getAuthParams()}`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  }, [getAuthParams]);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        page: currentPage,
        per_page: perPage,
        ...(filters.source && { source: filters.source }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });
      
      const response = await axios.get(`${API}/dashboard/leads?${params}`);
      setLeads(response.data.leads);
      setTotalLeads(response.data.total);
    } catch (error) {
      toast.error("Failed to fetch leads");
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [credentials, currentPage, perPage, filters]);

  const fetchSyncSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/dashboard/sync-settings?${getAuthParams()}`);
      setSyncSettings(response.data);
    } catch (error) {
      console.error("Failed to fetch sync settings:", error);
    }
  }, [getAuthParams]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/dashboard/reviews?${getAuthParams()}`);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    }
  }, [getAuthParams]);

  const handleSyncNow = async () => {
    if (!syncSettings.google_sheets_url) {
      toast.error("Please configure Google Sheets URL first");
      setShowSyncSettings(true);
      return;
    }
    // First time (no saved column mapping) → open modal so user can map columns
    if (!syncSettings.column_mapping || Object.keys(syncSettings.column_mapping).length === 0) {
      toast.info("Choose which sheet columns to import");
      setShowSyncSettings(true);
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await axios.post(
        `${API}/dashboard/sync-google-sheets?${getAuthParams()}&sheet_url=${encodeURIComponent(syncSettings.google_sheets_url)}`
      );
      toast.success(response.data.message);
      fetchStats();
      fetchLeads();
      fetchSyncSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDedupeSheets = async () => {
    setIsDeduping(true);
    try {
      // First: dry-run to count
      const dry = await axios.post(
        `${API}/dashboard/leads/dedupe-sheets-by-phone?${getAuthParams()}&dry_run=true`
      );
      const candidates = dry.data.candidates_to_delete;
      if (candidates === 0) {
        toast.success("No duplicate sheet leads found by phone — you're clean!");
        return;
      }
      const ok = window.confirm(
        `Found ${candidates} sheet-sourced duplicate(s) across ${dry.data.duplicate_phones} phone number(s).\n\n` +
        `For each phone, the oldest non-sheet entry (or oldest entry if all are from sheets) will be kept; the rest will be deleted.\n\n` +
        `Proceed with deletion?`
      );
      if (!ok) return;

      const res = await axios.post(
        `${API}/dashboard/leads/dedupe-sheets-by-phone?${getAuthParams()}&dry_run=false`
      );
      toast.success(`Deleted ${res.data.deleted} duplicate sheet lead(s) across ${res.data.duplicate_phones} phone number(s).`);
      fetchStats();
      fetchLeads();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Dedupe failed");
    } finally {
      setIsDeduping(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchLeads();
      fetchSyncSettings();
      fetchReviews();
    }
  }, [isAuthenticated, fetchStats, fetchLeads, fetchSyncSettings, fetchReviews]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await axios.patch(
        `${API}/dashboard/leads/${leadId}/status?status=${newStatus}&${getAuthParams()}`
      );
      toast.success(`Status updated to ${newStatus}`);
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await axios.delete(`${API}/dashboard/reviews/${reviewId}?${getAuthParams()}`);
      toast.success("Review deleted");
      fetchReviews();
    } catch (error) {
      toast.error("Failed to delete review");
    }
  };

  const handleToggleReview = async (reviewId) => {
    try {
      await axios.patch(`${API}/dashboard/reviews/${reviewId}/toggle?${getAuthParams()}`);
      toast.success("Review status updated");
      fetchReviews();
    } catch (error) {
      toast.error("Failed to toggle review");
    }
  };

  const handleDelete = async (leadId) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    
    try {
      await axios.delete(`${API}/dashboard/leads/${leadId}?${getAuthParams()}`);
      toast.success("Lead deleted");
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        ...(filters.source && { source: filters.source }),
        ...(filters.status && { status: filters.status }),
      });
      
      const response = await axios.get(`${API}/dashboard/export?${params}`);
      const leadsData = response.data.leads;
      
      const headers = ["Name", "Email", "Phone", "City", "Country", "Source", "Status", "Created At", "Campaign"];
      const csvContent = [
        headers.join(","),
        ...leadsData.map(lead => [
          `"${lead.name || ""}"`,
          `"${lead.email || ""}"`,
          `"${lead.phone || ""}"`,
          `"${lead.city || ""}"`,
          `"${lead.country || ""}"`,
          `"${lead.source || ""}"`,
          `"${lead.status || ""}"`,
          `"${lead.created_at || ""}"`,
          `"${lead.campaign || ""}"`,
        ].join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      
      toast.success(`Exported ${leadsData.length} leads`);
    } catch (error) {
      toast.error("Failed to export leads");
    }
  };

  const totalPages = Math.ceil(totalLeads / perPage);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Leads Dashboard</h1>
              <p className="text-slate-500 mt-2">Sign in to access your leads</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  placeholder="admin@visaxpert.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  data-testid="login-email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  data-testid="login-password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !credentials.email || !credentials.password}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                data-testid="login-submit"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:h-screen`}
        data-testid="dashboard-sidebar"
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Users size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">VisaXpert</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Leads dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            data-testid="sidebar-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
            <div className="space-y-0.5">
              <NavItem icon={LayoutDashboard} label="Leads" active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); setSidebarOpen(false); }} testId="nav-leads" badge={totalLeads} />
              <NavItem icon={FileSpreadsheet} label="Campaign Leads" active={activeTab === 'campaign_leads'} onClick={() => { setActiveTab('campaign_leads'); setSidebarOpen(false); }} testId="nav-campaign-leads" />
              <NavItem icon={Star} label="Reviews" active={activeTab === 'reviews'} onClick={() => { setActiveTab('reviews'); setSidebarOpen(false); }} testId="reviews-tab-btn" />
              <NavItem icon={MessageCircle} label="WhatsApp" active={activeTab === 'whatsapp'} onClick={() => { setActiveTab('whatsapp'); setSidebarOpen(false); }} testId="whatsapp-tab-btn" />
              <NavItem icon={Calendar} label="Bookings" active={activeTab === 'bookings'} onClick={() => { setActiveTab('bookings'); setSidebarOpen(false); }} testId="bookings-tab-btn" />
            </div>
          </div>

          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Site content</p>
            <div className="space-y-0.5">
              <NavItem icon={ImageIcon} label="Header Logo" active={activeTab === 'logos'} onClick={() => { setActiveTab('logos'); setSidebarOpen(false); }} testId="logos-tab-btn" />
              <NavItem icon={ImageIcon} label="Partner Logos" active={activeTab === 'partner_logos'} onClick={() => { setActiveTab('partner_logos'); setSidebarOpen(false); }} testId="partner-logos-tab-btn" />
              <NavItem icon={Sparkles} label="Anniversary Stories" active={activeTab === 'success_stories'} onClick={() => { setActiveTab('success_stories'); setSidebarOpen(false); }} testId="success-stories-tab-btn" />
              <NavItem icon={Users} label="Team" active={activeTab === 'team'} onClick={() => { setActiveTab('team'); setSidebarOpen(false); }} testId="team-tab-btn" />
              <NavItem icon={GraduationCap} label="Student Testimonials" active={activeTab === 'testimonials'} onClick={() => { setActiveTab('testimonials'); setSidebarOpen(false); }} testId="testimonials-tab-btn" />
            </div>
          </div>
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
              data-testid="user-menu-btn"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {(userInfo?.name || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{userInfo?.name || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {userInfo?.access === 'all' ? 'Admin · All access' : userInfo?.access === 'university_change' ? 'University change' : userInfo?.access === 'main_landing' ? 'Main landing' : 'Member'}
                </p>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  data-testid="logout-btn"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right side wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 rounded-md hover:bg-slate-100 text-slate-600"
                  data-testid="sidebar-open-btn"
                >
                  <MenuIcon size={20} />
                </button>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                    {activeTab === 'leads' && 'Leads'}
                    {activeTab === 'campaign_leads' && 'Campaign Leads'}
                    {activeTab === 'team' && 'Team'}
                    {activeTab === 'testimonials' && 'Student testimonials'}
                    {activeTab === 'reviews' && 'Reviews'}
                    {activeTab === 'whatsapp' && 'WhatsApp'}
                    {activeTab === 'bookings' && 'Bookings'}
                    {activeTab === 'logos' && 'Header logo'}
                    {activeTab === 'partner_logos' && 'Partner logos'}
                    {activeTab === 'success_stories' && 'Anniversary stories'}
                  </h2>
                  <p className="hidden sm:block text-xs text-slate-500 truncate">
                    {totalLeads} total leads
                    {userInfo?.access === 'university_change' && ' · University change'}
                    {userInfo?.access === 'main_landing' && ' · Main landing'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Sync pill (only main_landing / all access) */}
                {userInfo?.access === 'all' && (
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      syncSettings.google_sheets_url
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    } disabled:opacity-60`}
                    data-testid="sync-btn"
                    title={syncSettings.last_sync ? `Last sync: ${new Date(syncSettings.last_sync).toLocaleString()}` : 'Sync Google Sheets'}
                  >
                    <Zap size={15} className={isSyncing ? 'animate-pulse' : ''} />
                    <span>{isSyncing ? 'Syncing…' : 'Sync'}</span>
                  </button>
                )}

                {/* Refresh */}
                <button
                  onClick={() => { fetchStats(); fetchLeads(); fetchSyncSettings(); }}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  data-testid="refresh-btn"
                  title="Refresh"
                >
                  <RefreshCw size={18} />
                </button>

                {/* Actions dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setActionsOpen(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                    data-testid="actions-menu-btn"
                  >
                    <MoreHorizontal size={16} className="sm:hidden" />
                    <span className="hidden sm:inline">Actions</span>
                    <ChevronDown size={14} className="hidden sm:inline" />
                  </button>
                  {actionsOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActionsOpen(false)} />
                      <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40">
                        {userInfo?.access === 'all' && (
                          <>
                            <ActionItem icon={Link} label="Sheets settings" onClick={() => { setActionsOpen(false); setShowSyncSettings(true); }} testId="sync-settings-btn" />
                            <ActionItem icon={Upload} label="Import leads" onClick={() => { setActionsOpen(false); setShowImporter(true); }} testId="import-btn" />
                            <ActionItem icon={Trash2} label={isDeduping ? 'Checking…' : 'Dedupe sheet leads'} onClick={() => { setActionsOpen(false); handleDedupeSheets(); }} testId="dedupe-sheets-btn" disabled={isDeduping} danger />
                            <div className="h-px bg-slate-100" />
                          </>
                        )}
                        <ActionItem icon={Settings} label="Webhook setup" onClick={() => { setActionsOpen(false); setShowWebhookInfo(true); }} testId="webhook-info-btn" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Stats Grid */}
        {stats && activeTab === "leads" && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <StatCard title="Total Leads" value={stats.total_leads} icon={Users} color="blue" />
            <StatCard title="Today" value={stats.today_leads} icon={TrendingUp} color="green" />
            <StatCard title="Website" value={stats.by_source?.website || stats.website_leads || 0} icon={Monitor} color="indigo" />
            <StatCard title="Meta Ads" value={stats.by_source?.meta || stats.meta_leads || 0} icon={Facebook} color="purple" />
            <StatCard title="Google" value={stats.by_source?.google || stats.google_leads || 0} icon={Chrome} color="emerald" />
            <StatCard title="Uni Change" value={stats.by_source?.university_change || 0} icon={GraduationCap} color="teal" />
          </div>
        )}

        {activeTab === "leads" ? (
        <>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, city..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                data-testid="search-input"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              <select
                value={filters.source}
                onChange={(e) => {
                  setFilters({ ...filters, source: e.target.value });
                  setCurrentPage(1);
                }}
                className="px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                data-testid="source-filter"
              >
                <option value="">All Sources</option>
                <option value="website">Website</option>
                <option value="meta">Meta Ads</option>
                <option value="google">Google</option>
                <option value="university_change">University Change</option>
                <option value="germany_fair">Germany Fair</option>
                <option value="ielts_celebration">IELTS Celebration (14 yrs)</option>
                <option value="ivr_missed_call">IVR Calls</option>
              </select>
            </div>
            
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              data-testid="status-filter"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
              data-testid="export-btn"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto text-slate-400 mb-2" />
              <p className="text-slate-500">Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No leads found</p>
              <p className="text-slate-400 text-sm mt-1">Leads will appear here when captured</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      {(syncSettings.extra_columns || []).map((col) => (
                        <th
                          key={`th-${col}`}
                          className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                          data-testid={`extra-th-${col}`}
                        >
                          {col.replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead) => {
                      const SourceIcon = sourceIcons[lead.source] || Globe;
                      
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{lead.name || "—"}</div>
                            {lead.campaign && (
                              <div className="text-xs text-slate-400 mt-1">{lead.campaign}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {lead.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail size={14} className="text-slate-400" />
                                  <a href={`mailto:${lead.email}`} className="hover:text-blue-600">{lead.email}</a>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Phone size={14} className="text-slate-400" />
                                  <a href={`tel:${lead.phone}`} className="hover:text-blue-600">{lead.phone}</a>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2 text-sm text-slate-600">
                              <MapPin size={14} className="text-slate-400 mt-0.5" />
                              <div>
                                {lead.city && <div>{lead.city}</div>}
                                {lead.country && <div className="text-slate-400">{lead.country}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sourceColors[lead.source] || sourceColors.webhook}`}>
                              <SourceIcon size={12} />
                              {lead.source}
                            </span>
                            {lead.source === "ivr_missed_call" && lead.extra_data && (() => {
                              const s = (lead.extra_data.status || "").toLowerCase();
                              const talk = parseInt(lead.extra_data.talk_duration || "0", 10) || 0;
                              const connected = s === "answered" || talk > 0;
                              const badge = connected
                                ? { text: "Connected", cls: "bg-green-100 text-green-700" }
                                : s.startsWith("cancel-customer")
                                  ? { text: "Customer hung up", cls: "bg-orange-100 text-orange-700" }
                                  : { text: "Not connected", cls: "bg-red-100 text-red-700" };
                              const raw = lead.extra_data.raw_params || {};
                              const kp = (
                                lead.extra_data.key_press ?? lead.extra_data.KeyPress ?? lead.extra_data.KeyPressed ??
                                lead.extra_data.key_pressed ?? lead.extra_data.keypress ?? lead.extra_data.Keypress ??
                                lead.extra_data.digits ?? lead.extra_data.Digits ?? lead.extra_data.DigitsPressed ??
                                lead.extra_data.DTMF ?? lead.extra_data.dtmf ?? lead.extra_data.PressedKey ??
                                lead.extra_data.pressed_key ?? lead.extra_data.ivr_input ??
                                raw.key_press ?? raw.KeyPress ?? raw.KeyPressed ?? raw.key_pressed ??
                                raw.keypress ?? raw.Keypress ?? raw.digits ?? raw.Digits ??
                                raw.DigitsPressed ?? raw.DTMF ?? raw.dtmf ?? raw.PressedKey ??
                                raw.pressed_key ?? raw.ivr_input ?? ""
                              );
                              const keypress = (kp === null || kp === undefined) ? "" : String(kp).trim();
                              return (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}
                                    data-testid={`ivr-badge-${lead.id}`}>
                                    {badge.text}
                                    {talk > 0 ? ` · ${talk}s talk` : ""}
                                  </div>
                                  {keypress !== "" && (
                                    <span
                                      data-testid={`ivr-keypress-badge-${lead.id}`}
                                      title="IVR menu keypress"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white"
                                    >
                                      <span className="opacity-75 font-medium">Key</span>
                                      <span className="font-mono tracking-wider">{keypress}</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                            {lead.source === "university_change" && lead.extra_data?.consultation_mode && (() => {
                              const mode = lead.extra_data.consultation_mode;
                              const modeLabelMap = { in_person: "In-Person", telephonic: "Telephonic", online: "Online" };
                              const modeColorMap = {
                                in_person: "bg-emerald-100 text-emerald-700",
                                telephonic: "bg-blue-100 text-blue-700",
                                online: "bg-indigo-100 text-indigo-700",
                              };
                              return (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5" data-testid={`uc-mode-badge-${lead.id}`}>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${modeColorMap[mode] || "bg-slate-100 text-slate-700"}`}>
                                    {modeLabelMap[mode] || mode}
                                  </span>
                                  {mode === "online" && lead.extra_data.meeting_link && (
                                    <a
                                      href={lead.extra_data.meeting_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                                      data-testid={`uc-join-meeting-${lead.id}`}
                                    >
                                      <Send size={10} /> Join Meeting
                                    </a>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[lead.status]}`}
                              data-testid={`status-select-${lead.id}`}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="converted">Converted</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Calendar size={14} />
                              {new Date(lead.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          </td>
                          {(syncSettings.extra_columns || []).map((col) => (
                            <td
                              key={`td-${lead.id}-${col}`}
                              className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate"
                              title={lead.extra_data?.[col] || ""}
                              data-testid={`extra-td-${col}`}
                            >
                              {lead.extra_data?.[col] || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                data-testid={`view-btn-${lead.id}`}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(lead.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                data-testid={`delete-btn-${lead.id}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-slate-200">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span data-testid="pagination-summary">
                    Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalLeads)} of {totalLeads} leads
                  </span>
                  <span className="hidden sm:inline text-slate-300">·</span>
                  <label className="hidden sm:flex items-center gap-2">
                    <span className="text-slate-500">Rows per page</span>
                    <select
                      value={perPage}
                      onChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                      className="px-2 py-1 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      data-testid="per-page-select"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="prev-page-btn"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-slate-600 px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="next-page-btn"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        </>
        ) : activeTab === "reviews" ? (
        /* Reviews Management Tab */
        <div className="space-y-6" data-testid="reviews-management">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Manage Reviews</h2>
              <p className="text-sm text-slate-500 mt-1">Add reviews that appear on your landing pages</p>
            </div>
            <button
              onClick={() => setShowAddReview(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm"
              data-testid="add-review-btn"
            >
              <Plus size={16} />
              Add Review
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No reviews yet</p>
              <p className="text-slate-400 text-sm mt-1">Add reviews to display on your landing pages</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reviews.map((review) => (
                <div key={review.review_id} className={`bg-white rounded-xl border p-5 ${review.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50/30'}`} data-testid={`review-card-${review.review_id}`}>
                  <div className="flex items-start gap-4">
                    {review.image_url ? (
                      <img src={review.image_url.replace(/^\/assets\/uploads\//, "/api/uploads/")} alt={review.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-700 font-bold text-xl">{review.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{review.name}</h4>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-sm text-slate-500">{review.country}</span>
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${review.page === 'main' ? 'bg-blue-100 text-blue-700' : review.page === 'university_change' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                          {review.page === 'main' ? 'Main Page' : review.page === 'university_change' ? 'Uni Change' : 'Germany Fair'}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[...Array(review.rating || 5)].map((_, i) => (
                          <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-slate-600 text-sm">"{review.content}"</p>
                      {!review.is_active && <p className="text-red-500 text-xs mt-2 font-medium">Hidden from pages</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggleReview(review.review_id)}
                        className={`p-2 rounded-lg transition-colors ${review.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                        title={review.is_active ? "Hide review" : "Show review"}
                        data-testid={`toggle-review-${review.review_id}`}
                      >
                        {review.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.review_id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        data-testid={`delete-review-${review.review_id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        ) : activeTab === "campaign_leads" ? (
        <CampaignLeadsManager credentials={credentials} />
        ) : activeTab === "team" || activeTab === "testimonials" ? (
        <ProfilesManager key={activeTab} credentials={credentials} kind={activeTab} />
        ) : activeTab === "whatsapp" ? (
        /* WhatsApp Hub: scheduled templates + IELTS settings + UC settings */
        <WhatsAppHub credentials={credentials} />
        ) : activeTab === "partner_logos" ? (
        /* Partner Logos Manager (sliding) */
        <PartnerLogosManager credentials={credentials} />
        ) : activeTab === "success_stories" ? (
        /* IELTS Anniversary Success Stories */
        <SuccessStoriesManager credentials={credentials} />
        ) : activeTab === "bookings" ? (
        /* University-change Bookings Manager */
        <BookingsManager credentials={credentials} />
        ) : (
        /* Header Logo Manager */
        <LogosManager credentials={credentials} />
        )}
      </main>
      </div>

      {/* Add Review Modal */}
      {showAddReview && (
        <AddReviewModal
          onClose={() => setShowAddReview(false)}
          credentials={credentials}
          onReviewAdded={() => { fetchReviews(); setShowAddReview(false); }}
        />
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Modal onClose={() => setSelectedLead(null)} title="Lead Details">
          <div className="space-y-4">
            <DetailRow label="Name" value={selectedLead.name} />
            <DetailRow label="Email" value={selectedLead.email} />
            <DetailRow label="Phone" value={selectedLead.phone} />
            <DetailRow label="City" value={selectedLead.city} />
            <DetailRow label="Country" value={selectedLead.country} />
            <DetailRow label="Source" value={selectedLead.source} />
            <DetailRow label="Status" value={selectedLead.status} />
            <DetailRow label="Campaign" value={selectedLead.campaign} />
            <DetailRow label="Platform" value={selectedLead.platform} />
            <DetailRow label="Created" value={new Date(selectedLead.created_at).toLocaleString()} />
            {selectedLead.source === "ivr_missed_call" && selectedLead.extra_data && (
              <IVRCallPanel extra={selectedLead.extra_data} />
            )}
            {selectedLead.source === "university_change" && selectedLead.extra_data?.consultation_mode && (
              <UniversityChangePanel extra={selectedLead.extra_data} />
            )}
            {selectedLead.extra_data && (() => {
              const META_KEYS = new Set([
                "synced_from", "sync_time", "imported_from", "original_row",
                "consultation_mode", "meeting_link", "current_university", "transfer_type",
                "english_test", "urgency", "nearest_office",
                "call_duration", "talk_duration", "status",
                // IVR fields — already surfaced in the dedicated IVR panel
                "destination_number", "start_time", "end_time", "direction",
                "receiver_name", "call_recording_url", "call_sid", "call_group",
                "key_press", "KeyPress", "KeyPressed", "key_pressed",
                "keypress", "Keypress", "digits", "Digits", "DigitsPressed",
                "DTMF", "dtmf", "PressedKey", "pressed_key", "ivr_input",
                "coins", "campaign_id", "client_id", "raw_params",
              ]);
              const entries = Object.entries(selectedLead.extra_data).filter(
                ([k, v]) => !META_KEYS.has(k) && v !== null && v !== undefined && v !== ""
              );
              if (entries.length === 0) return null;
              const prettify = (k) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div className="pt-2 border-t border-slate-100" data-testid="lead-extras-section">
                  <p className="text-sm font-medium text-slate-500 mb-3">Additional details</p>
                  <div className="space-y-2.5">
                    {entries.map(([k, v]) => (
                      <DetailRow
                        key={k}
                        label={prettify(k)}
                        value={typeof v === "object" ? JSON.stringify(v) : String(v)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Webhook Info Modal */}
      {showWebhookInfo && (
        <Modal onClose={() => setShowWebhookInfo(false)} title="Integration Setup" large>
          <div className="space-y-6">
            {/* Facebook Setup */}
            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Facebook size={20} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Meta (Facebook/Instagram) Lead Ads</h4>
                  <p className="text-xs text-slate-500">Direct integration - No Zapier needed</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <p className="font-medium text-slate-700">Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-slate-600">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">developers.facebook.com</a> → Create App → Business</li>
                  <li>Add <strong>Webhooks</strong> product to your app</li>
                  <li>Click <strong>Configure</strong> → Select <strong>Page</strong> from dropdown</li>
                  <li>Click <strong>Subscribe to this object</strong></li>
                  <li>Enter these details:</li>
                </ol>
                
                <div className="bg-white rounded-lg p-3 space-y-2">
                  <div>
                    <label className="text-xs text-slate-500">Callback URL:</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-100 px-2 py-1 rounded text-xs">{BACKEND_URL}/api/webhook/facebook</code>
                      <button onClick={() => copyToClipboard(`${BACKEND_URL}/api/webhook/facebook`)} className="p-1 text-slate-400 hover:text-slate-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Verify Token:</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-100 px-2 py-1 rounded text-xs">visaxpert_leads_2024</code>
                      <button onClick={() => copyToClipboard("visaxpert_leads_2024")} className="p-1 text-slate-400 hover:text-slate-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <ol start={6} className="list-decimal list-inside space-y-2 text-slate-600">
                  <li>Subscribe to <strong>leadgen</strong> field</li>
                  <li>Go to your Facebook Page Settings → Leads → Connect your app</li>
                  <li>Done! Leads will flow directly to this dashboard</li>
                </ol>
              </div>
            </div>

            {/* Google Sheets Import */}
            <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Google Sheets Import</h4>
                  <p className="text-xs text-slate-500">Import leads from Google Ads via Sheets</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <p className="font-medium text-slate-700">Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-slate-600">
                  <li>In Google Ads, go to Lead Form Extensions</li>
                  <li>Enable "Google Sheets" as lead destination</li>
                  <li>Export leads from Google Sheets as CSV</li>
                  <li>Click "Import" button above to upload</li>
                </ol>
                
                <button
                  onClick={() => { setShowWebhookInfo(false); setShowImporter(true); }}
                  className="w-full mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
                >
                  Open Importer
                </button>
              </div>
            </div>

            {/* Universal Webhook */}
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Globe size={20} className="text-slate-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Universal Webhook</h4>
                  <p className="text-xs text-slate-500">For custom integrations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm">{BACKEND_URL}/api/webhook/lead</code>
                <button onClick={() => copyToClipboard(`${BACKEND_URL}/api/webhook/lead`)} className="p-2 text-slate-400 hover:text-slate-600">
                  <Copy size={16} />
                </button>
              </div>
              
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">View Example Payload</summary>
                <pre className="mt-2 bg-slate-50 p-3 rounded-lg text-xs overflow-auto">
{JSON.stringify({
  name: "John Doe",
  email: "john@example.com",
  phone: "9876543210",
  city: "Delhi",
  country: "Canada",
  source: "custom",
  campaign: "My Campaign"
}, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </Modal>
      )}

      {/* Importer Modal */}
      {showImporter && (
        <SheetsImporter
          onClose={() => setShowImporter(false)}
          credentials={credentials}
          onImportComplete={() => { fetchStats(); fetchLeads(); }}
        />
      )}

      {/* Google Sheets Sync Settings Modal */}
      {showSyncSettings && (
        <GoogleSheetsSettings
          onClose={() => setShowSyncSettings(false)}
          credentials={credentials}
          syncSettings={syncSettings}
          onSettingsSaved={() => { fetchSyncSettings(); fetchLeads(); fetchStats(); }}
          onSyncNow={handleSyncNow}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}

// Modal Component
function Modal({ children, onClose, title, large = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${large ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto p-6`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={24} />
        </button>
        <h3 className="text-xl font-bold text-slate-900 mb-6">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
  };
  
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

// Sidebar nav item
function NavItem({ icon: Icon, label, active, onClick, testId, badge }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={17} className={active ? 'text-blue-600' : 'text-slate-400'} />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge !== null && badge !== 0 && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {badge > 999 ? `${Math.floor(badge / 1000)}k+` : badge}
        </span>
      )}
    </button>
  );
}

// Dropdown action item
function ActionItem({ icon: Icon, label, onClick, testId, disabled = false, danger = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors disabled:opacity-50 ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon size={15} className={danger ? 'text-rose-500' : 'text-slate-400'} />
      <span>{label}</span>
    </button>
  );
}

// Detail Row Component
function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 text-right">{value}</p>
    </div>
  );
}

// IVR Call Detail Panel — renders call status, durations, recording etc. in a friendly way
function IVRCallPanel({ extra }) {
  if (!extra) return null;
  const status = (extra.status || "").toString();
  const callDuration = parseInt(extra.call_duration || "0", 10) || 0;
  const talkDuration = parseInt(extra.talk_duration || "0", 10) || 0;
  const recording = extra.call_recording_url || "";
  const receiver = extra.receiver_name || extra.destination_number || "";
  const start = extra.start_time || "";
  // Robust keypress lookup — different IVR providers spell this field
  // differently, plus the raw_params bag is checked as a last resort.
  const raw = extra.raw_params || {};
  const keyPressRaw = (
    extra.key_press ?? extra.KeyPress ?? extra.KeyPressed ?? extra.key_pressed ??
    extra.keypress ?? extra.Keypress ?? extra.digits ?? extra.Digits ??
    extra.DigitsPressed ?? extra.DTMF ?? extra.dtmf ?? extra.PressedKey ??
    extra.pressed_key ?? extra.ivr_input ??
    raw.key_press ?? raw.KeyPress ?? raw.KeyPressed ?? raw.key_pressed ??
    raw.keypress ?? raw.Keypress ?? raw.digits ?? raw.Digits ??
    raw.DigitsPressed ?? raw.DTMF ?? raw.dtmf ?? raw.PressedKey ??
    raw.pressed_key ?? raw.ivr_input ?? ""
  );
  const keyPress = (keyPressRaw === null || keyPressRaw === undefined) ? "" : String(keyPressRaw).trim();
  const callGroup = (extra.call_group || raw.call_group || "").toString();

  const connected = talkDuration > 0 || status.toLowerCase() === "answered";
  const statusMap = {
    "answered": { label: "Connected", color: "bg-green-100 text-green-800 border-green-200" },
    "cancel-customer": { label: "Customer hung up", color: "bg-orange-100 text-orange-800 border-orange-200" },
    "cancel-agent": { label: "Agent didn't answer", color: "bg-red-100 text-red-800 border-red-200" },
    "no-answer": { label: "No answer", color: "bg-red-100 text-red-800 border-red-200" },
    "missed": { label: "Missed call", color: "bg-red-100 text-red-800 border-red-200" },
  };
  const pill = statusMap[status.toLowerCase()] || {
    label: status || "Unknown",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white" data-testid="ivr-call-panel">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Call Details</p>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${pill.color}`}
          data-testid="ivr-status-pill">
          {connected ? "✓ " : ""}{pill.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-slate-500">Call duration</p>
          <p className="text-slate-900 font-medium">{callDuration}s</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Talk duration</p>
          <p className={`font-medium ${talkDuration > 0 ? "text-green-700" : "text-slate-500"}`}>
            {talkDuration}s {talkDuration === 0 ? "(no talk)" : ""}
          </p>
        </div>
        {/* Keypress — only render if the caller pressed something on the IVR menu */}
        {keyPress !== "" && (
          <div className="col-span-2" data-testid="ivr-keypress">
            <p className="text-xs text-slate-500">Keypress (IVR menu)</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-md bg-blue-600 text-white font-mono text-sm font-bold tracking-wider">
                {keyPress}
              </span>
              <p className="text-xs text-slate-500">Pressed during the menu prompt</p>
            </div>
          </div>
        )}
        {callGroup && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Call group</p>
            <p className="text-slate-900">{callGroup}</p>
          </div>
        )}
        {receiver && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Reached</p>
            <p className="text-slate-900">{receiver}</p>
          </div>
        )}
        {start && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Started at</p>
            <p className="text-slate-900">{start}</p>
          </div>
        )}
      </div>
      {recording && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Recording</p>
          <audio controls src={recording} className="w-full" />
          <a href={recording} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            Open recording in new tab ↗
          </a>
        </div>
      )}
    </div>
  );
}

// University Change consultation panel — shows mode + meeting link if online
function UniversityChangePanel({ extra }) {
  if (!extra) return null;
  const mode = (extra.consultation_mode || "").toLowerCase();
  const meetingLink = extra.meeting_link || "";
  const currentUni = extra.current_university || "";
  const transferType = extra.transfer_type || "";

  const modeLabelMap = {
    in_person: { label: "In-Person Meeting (Berlin Office)", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    telephonic: { label: "Telephonic Call", color: "bg-blue-100 text-blue-800 border-blue-200" },
    online: { label: "Online Meeting", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  };
  const pill = modeLabelMap[mode] || { label: extra.consultation_mode || "—", color: "bg-slate-100 text-slate-700 border-slate-200" };

  const copyLink = async () => {
    if (!meetingLink) return;
    try {
      await navigator.clipboard.writeText(meetingLink);
      toast.success("Meeting link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-gradient-to-br from-emerald-50 via-white to-indigo-50" data-testid="uc-consultation-panel">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm font-semibold text-slate-700">Consultation Details</p>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${pill.color}`} data-testid="uc-mode-pill">
          {pill.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {currentUni && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Current university</p>
            <p className="text-slate-900 font-medium">{currentUni}</p>
          </div>
        )}
        {transferType && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Transfer type</p>
            <p className="text-slate-900">{transferType}</p>
          </div>
        )}
      </div>

      {mode === "online" && (
        <div className="mt-3 pt-3 border-t border-indigo-200">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Jitsi Meeting Room</p>
          {meetingLink ? (
            <div className="space-y-2">
              <div className="bg-white border border-indigo-200 rounded-lg p-2 text-xs font-mono text-indigo-700 break-all" data-testid="uc-meeting-link-text">
                {meetingLink}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                  data-testid="uc-join-meeting-btn"
                >
                  <Send size={12} /> Join Meeting
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors"
                  data-testid="uc-copy-meeting-btn"
                >
                  <Copy size={12} /> Copy link
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Meeting link not generated for this lead.</p>
          )}
        </div>
      )}

      {mode === "in_person" && (
        <div className="mt-3 pt-3 border-t border-emerald-200">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Office Address</p>
          <p className="text-sm text-slate-900">Belziger Strasse 69-71, 10823 Berlin, Germany</p>
          <a
            href="https://maps.app.goo.gl/vADT9cGfTs2biFX2A"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            data-testid="uc-open-maps-btn"
          >
            <MapPin size={12} /> Open in Google Maps
          </a>
        </div>
      )}

      {mode === "telephonic" && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Callback Number</p>
          <p className="text-sm text-slate-900">Counsellor will call from <strong>+49 1784555932</strong></p>
        </div>
      )}
    </div>
  );
}


// Google Sheets Importer Component
function SheetsImporter({ onClose, credentials, onImportComplete }) {
  const [csvData, setCsvData] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^,]+)/g) || [];
      const row = {};
      
      headers.forEach((header, index) => {
        let value = values[index] || "";
        value = value.trim().replace(/^"|"$/g, "");
        
        // Map common header variations
        if (header.includes("name")) row.name = value;
        else if (header.includes("email")) row.email = value;
        else if (header.includes("phone") || header.includes("mobile")) row.phone = value;
        else if (header.includes("city")) row.city = value;
        else if (header.includes("country")) row.country = value;
        else if (header.includes("source")) row.source = value;
        else if (header.includes("date") || header.includes("time")) row.date = value;
      });
      
      if (row.name || row.email || row.phone) {
        data.push(row);
      }
    }
    
    return data;
  };

  const handlePaste = (e) => {
    const text = e.target.value;
    setCsvData(text);
    const parsed = parseCSV(text);
    setParsedData(parsed);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvData(text);
      const parsed = parseCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("No data to import");
      return;
    }
    
    setIsImporting(true);
    try {
      const response = await axios.post(
        `${API}/dashboard/import-sheets?email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`,
        parsedData
      );
      setResult(response.data);
      toast.success(`Imported ${response.data.imported} leads!`);
      onImportComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Import from Google Sheets" large>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>How to export from Google Sheets:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Open your Google Sheet with leads</li>
            <li>Go to File → Download → CSV</li>
            <li>Upload the CSV file below or paste the data</li>
          </ol>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Upload CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Or Paste CSV Data</label>
          <textarea
            value={csvData}
            onChange={handlePaste}
            placeholder="name,email,phone,city,country,date&#10;John Doe,john@example.com,9876543210,Delhi,Canada,2024-01-01"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-32 font-mono"
          />
        </div>

        {parsedData.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-700 mb-2">Preview ({parsedData.length} rows found):</p>
            <div className="max-h-40 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="p-1">Name</th>
                    <th className="p-1">Email</th>
                    <th className="p-1">Phone</th>
                    <th className="p-1">City</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="p-1">{row.name || "—"}</td>
                      <td className="p-1">{row.email || "—"}</td>
                      <td className="p-1">{row.phone || "—"}</td>
                      <td className="p-1">{row.city || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 5 && (
                <p className="text-xs text-slate-400 mt-2">...and {parsedData.length - 5} more rows</p>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className={`rounded-lg p-3 ${result.imported > 0 ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
            <p className="font-medium">Import Complete!</p>
            <p className="text-sm">Imported: {result.imported} | Skipped: {result.skipped}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || parsedData.length === 0}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isImporting ? "Importing..." : `Import ${parsedData.length} Leads`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Google Sheets Auto-Sync Settings Component (with column mapping)
const LEAD_FIELD_DEFS = [
  { key: "unique_id", label: "Unique Row ID (recommended)", required: false, hints: ["id", "lead_id", "row_id", "uuid"] },
  { key: "name", label: "Full Name", required: true, hints: ["name", "full name", "full_name"] },
  { key: "email", label: "Email", required: false, hints: ["email", "email address"] },
  { key: "phone", label: "Phone", required: true, hints: ["phone", "phone number", "phone_number", "mobile"] },
  { key: "city", label: "City", required: false, hints: ["city"] },
  { key: "country", label: "Country", required: false, hints: ["country", "country of interest"] },
  { key: "source", label: "Source", required: false, hints: ["source", "platform"] },
  { key: "date", label: "Date / Created", required: false, hints: ["date", "created_time", "timestamp", "created"] },
  { key: "campaign", label: "Campaign", required: false, hints: ["campaign", "campaign_name", "ad_name", "form_name"] },
  { key: "preferred_city", label: "Preferred City (Germany Fair)", required: false, hints: ["select_fair_location", "preferred_city", "fair_city"] },
];

function autoGuessMapping(headers) {
  const lower = headers.map(h => h.toLowerCase());
  const guess = {};
  for (const f of LEAD_FIELD_DEFS) {
    for (const h of f.hints) {
      const idx = lower.indexOf(h.toLowerCase());
      if (idx !== -1) { guess[f.key] = headers[idx]; break; }
    }
  }
  return guess;
}

function GoogleSheetsSettings({ onClose, credentials, syncSettings, onSettingsSaved, onSyncNow, isSyncing }) {
  const hasSavedMapping = syncSettings.column_mapping && Object.keys(syncSettings.column_mapping).length > 0;
  const [step, setStep] = useState(hasSavedMapping ? "mapping" : "url");
  const [sheetUrl, setSheetUrl] = useState(syncSettings.google_sheets_url || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { headers, samples, total_rows }
  const [mapping, setMapping] = useState(syncSettings.column_mapping || {});
  const [extraCols, setExtraCols] = useState(syncSettings.extra_columns || []);
  const [detailsCols, setDetailsCols] = useState(syncSettings.details_columns || []);
  const [defaultSource, setDefaultSource] = useState(syncSettings.default_source || "google_sheets");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(!!syncSettings.auto_sync_enabled);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(syncSettings.sync_interval_minutes || 30);

  // Re-sync when parent finishes loading syncSettings after a cold open
  useEffect(() => {
    const saved = syncSettings.column_mapping && Object.keys(syncSettings.column_mapping).length > 0;
    if (saved) {
      setStep((curr) => (curr === "url" ? "mapping" : curr));
      setMapping((curr) => (Object.keys(curr).length === 0 ? syncSettings.column_mapping : curr));
      setExtraCols((curr) => (curr.length === 0 ? (syncSettings.extra_columns || []) : curr));
      setDetailsCols((curr) => (curr.length === 0 ? (syncSettings.details_columns || []) : curr));
      if (!sheetUrl && syncSettings.google_sheets_url) setSheetUrl(syncSettings.google_sheets_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncSettings.column_mapping, syncSettings.google_sheets_url]);

  // On mapping step without previewData, silently re-fetch the sheet so the
  // dropdown options & extra-column chips become editable again.
  useEffect(() => {
    if (step === "mapping" && !previewData && sheetUrl && !isPreviewLoading) {
      (async () => {
        try {
          setIsPreviewLoading(true);
          const res = await axios.post(
            `${API}/dashboard/sheets/preview?${authParams}&sheet_url=${encodeURIComponent(sheetUrl)}&sample_size=5`
          );
          setPreviewData(res.data);
        } catch (e) { /* silent — user can hit Change sheet */ }
        finally { setIsPreviewLoading(false); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sheetUrl]);

  const authParams = `email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`;

  const handlePreview = async () => {
    if (!sheetUrl) {
      toast.error("Please paste your Google Sheet URL first");
      return;
    }
    setIsPreviewLoading(true);
    try {
      const res = await axios.post(
        `${API}/dashboard/sheets/preview?${authParams}&sheet_url=${encodeURIComponent(sheetUrl)}&sample_size=5`
      );
      setPreviewData(res.data);
      // Auto-guess mapping if user hasn't already set one
      const headers = res.data.headers || [];
      if (!mapping || Object.keys(mapping).length === 0) {
        setMapping(autoGuessMapping(headers));
      }
      setStep("mapping");
      // Persist URL so future syncs/auto-sync use it
      try {
        await axios.post(
          `${API}/dashboard/sync-settings?${authParams}&google_sheets_url=${encodeURIComponent(sheetUrl)}&auto_sync_enabled=false&sync_interval_minutes=30`
        );
      } catch (e) { /* non-fatal */ }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not read sheet. Make sure it's shared as 'Anyone with link can view'.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const setMap = (leadField, sheetCol) => {
    setMapping(prev => {
      const next = { ...prev };
      if (sheetCol) next[leadField] = sheetCol;
      else delete next[leadField];
      return next;
    });
  };

  const toggleExtra = (col) => {
    setExtraCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    setDetailsCols(prev => prev.filter(c => c !== col));
  };

  const toggleDetails = (col) => {
    setDetailsCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    setExtraCols(prev => prev.filter(c => c !== col));
  };

  const mappedColumns = new Set(Object.values(mapping).filter(Boolean));

  const handleImport = async () => {
    if (!mapping.name && !mapping.phone && !mapping.email) {
      toast.error("Please map at least one of Name / Phone / Email");
      return;
    }
    setIsImporting(true);
    try {
      const res = await axios.post(`${API}/dashboard/sheets/sync-with-mapping?${authParams}`, {
        sheet_url: sheetUrl,
        column_mapping: mapping,
        extra_columns: extraCols,
        details_columns: detailsCols,
        default_source: defaultSource || "google_sheets",
        save_mapping: true,
      });
      // Persist auto-sync prefs on the same settings doc
      try {
        await axios.post(
          `${API}/dashboard/sync-settings?${authParams}&google_sheets_url=${encodeURIComponent(sheetUrl)}&auto_sync_enabled=${autoSyncEnabled}&sync_interval_minutes=${syncIntervalMinutes}`
        );
      } catch (e) { /* non-fatal */ }
      toast.success(res.data.message || "Sync complete!");
      onSettingsSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Sync failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetMapping = () => {
    setMapping({});
    setExtraCols([]);
    setStep("url");
    setPreviewData(null);
  };

  return (
    <Modal onClose={onClose} title="Google Sheets Auto-Sync" large>
      <div className="space-y-6" data-testid="sheets-sync-modal">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded-full ${step === "url" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>1. Sheet URL</span>
          <span className="text-slate-400">›</span>
          <span className={`px-2 py-1 rounded-full ${step === "mapping" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>2. Map Columns</span>
        </div>

        {step === "url" && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Open your Google Sheet (the one Meta / Google Ads pushes leads into)</li>
                <li>Click <strong>Share</strong> → Set to <strong>"Anyone with link can view"</strong></li>
                <li>Paste the URL below, then <strong>Preview</strong> to see its columns</li>
                <li>Choose which sheet column maps to Name, Phone, Email, City, etc.</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Google Sheet URL</label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                data-testid="sheet-url-input"
              />
            </div>

            {syncSettings.last_sync && (
              <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Last Sync</p>
                  <p className="text-xs text-slate-500">{new Date(syncSettings.last_sync).toLocaleString()}</p>
                </div>
                {syncSettings.last_sync_result && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {syncSettings.last_sync_result}
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={isPreviewLoading || !sheetUrl}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="preview-columns-btn"
              >
                <Eye size={16} />
                {isPreviewLoading ? "Reading sheet…" : "Preview Columns"}
              </button>
            </div>
          </>
        )}

        {step === "mapping" && (
          <>
            {previewData && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-emerald-900">{previewData.headers?.length || 0} columns</span>
                  <span className="text-emerald-700"> &middot; ~{previewData.total_rows || 0} rows in sheet</span>
                </div>
                <button
                  onClick={handleResetMapping}
                  className="text-xs text-emerald-700 underline hover:text-emerald-900"
                  data-testid="change-sheet-btn"
                >
                  Change sheet
                </button>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">Map sheet columns → Lead fields</h4>
              <div className="space-y-2">
                {LEAD_FIELD_DEFS.map((f) => {
                  const currentVal = mapping[f.key] || "";
                  const headerOptions = previewData?.headers || [];
                  // Include the currently-mapped value even when headers aren't loaded yet
                  // (so the user sees their saved mapping on a cold modal reopen).
                  const optionList = currentVal && !headerOptions.includes(currentVal)
                    ? [currentVal, ...headerOptions]
                    : headerOptions;
                  return (
                    <div key={f.key} className="grid grid-cols-12 items-center gap-3">
                      <label className="col-span-5 text-sm text-slate-700">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        value={currentVal}
                        onChange={(e) => setMap(f.key, e.target.value)}
                        className="col-span-7 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        data-testid={`map-${f.key}`}
                      >
                        <option value="">— Not mapped —</option>
                        {optionList.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Default Source (if not mapped)</label>
              <input
                type="text"
                value={defaultSource}
                onChange={(e) => setDefaultSource(e.target.value)}
                placeholder="e.g. germany_fair, google_sheets, meta"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                data-testid="default-source-input"
              />
              <p className="text-xs text-slate-500 mt-1">Used as the lead source when the sheet doesn't have its own source column mapped.</p>
            </div>

            {/* Auto-sync configuration */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">Auto-Sync</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Run this sync automatically in the background. Only new rows are imported — already-synced rows are skipped via the Unique Row ID (or email/phone fallback).
                  </p>
                </div>
                <label className="inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="sr-only peer"
                    data-testid="auto-sync-toggle"
                  />
                  <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {autoSyncEnabled && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-slate-700">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={syncIntervalMinutes}
                    onChange={(e) => setSyncIntervalMinutes(parseInt(e.target.value || "30", 10))}
                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    data-testid="sync-interval-input"
                  />
                  <span className="text-slate-700">minutes</span>
                  {syncIntervalMinutes < 5 && (
                    <span className="text-xs text-amber-600 ml-2">⚠ Very frequent — may hit Google's rate limits.</span>
                  )}
                </div>
              )}
            </div>

            {previewData && previewData.headers && previewData.headers.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-1 text-sm">Unmapped columns</h4>
                <p className="text-xs text-slate-500 mb-3">
                  For each column you haven&apos;t mapped to a known lead field, decide what to do with it:
                  show it as an extra column in the leads table, keep it for the View Details popup only, or skip it.
                </p>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {previewData.headers
                    .filter(h => !mappedColumns.has(h))
                    .map(h => {
                      const isTable = extraCols.includes(h);
                      const isDetails = detailsCols.includes(h);
                      const isSkip = !isTable && !isDetails;
                      return (
                        <div key={h} className="grid grid-cols-12 items-center gap-3 px-3 py-2 text-sm">
                          <div className="col-span-5 truncate text-slate-700 font-medium" title={h}>{h}</div>
                          <div className="col-span-7 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => { toggleExtra(h); /* if was on, turns off */
                                if (isTable) { /* toggleExtra already removed it */ }
                              }}
                              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                isTable
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                              }`}
                              data-testid={`col-table-${h}`}
                              title="Show as a column in the leads table"
                            >
                              {isTable ? "✓ Show in table" : "Show in table"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleDetails(h)}
                              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                isDetails
                                  ? "bg-violet-600 text-white border-violet-600"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-violet-400"
                              }`}
                              data-testid={`col-details-${h}`}
                              title="Keep this value but only show it inside the View Details popup"
                            >
                              {isDetails ? "✓ View details" : "View details"}
                            </button>
                            <span
                              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                                isSkip
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : "bg-white text-slate-300 border-transparent"
                              }`}
                              data-testid={`col-skip-${h}`}
                            >
                              {isSkip ? "Skipped" : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {previewData.headers.filter(h => !mappedColumns.has(h)).length === 0 && (
                    <p className="text-xs text-slate-500 px-3 py-3">All columns are already mapped above.</p>
                  )}
                </div>
              </div>
            )}

            {previewData?.samples?.length > 0 && (
              <details className="border border-slate-200 rounded-lg overflow-hidden">
                <summary className="px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100">
                  Preview first {previewData.samples.length} row{previewData.samples.length > 1 ? "s" : ""}
                </summary>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        {previewData.headers.map(h => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.samples.map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          {previewData.headers.map(h => (
                            <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[200px] truncate" title={row[h]}>
                              {row[h] || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("url")}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium"
                data-testid="back-to-url-btn"
              >
                <ChevronLeft size={14} className="inline mr-1" />Back
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || !sheetUrl}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="import-with-mapping-btn"
              >
                <Zap size={16} className={isImporting ? "animate-pulse" : ""} />
                {isImporting ? "Importing…" : "Import & Save Mapping"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}


// Add Review Modal Component
function AddReviewModal({ onClose, credentials, onReviewAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    content: "",
    image_url: "",
    rating: 5,
  });
  const [selectedPages, setSelectedPages] = useState(["main"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const PAGE_OPTIONS = [
    { value: "main", label: "Main Landing Page" },
    { value: "university_change", label: "University Change Page" },
    { value: "germany_fair", label: "Germany Fair Page" },
  ];

  const togglePage = (value) => {
    setSelectedPages((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to backend
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const response = await axios.post(
        `${API}/upload/image?email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`,
        uploadData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setFormData({ ...formData, image_url: response.data.image_url });
      toast.success("Photo uploaded!");
    } catch (error) {
      toast.error("Failed to upload photo");
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.country || !formData.content) {
      toast.error("Please fill in name, country, and review content");
      return;
    }
    if (formData.content.length < 10) {
      toast.error("Review content must be at least 10 characters");
      return;
    }
    if (selectedPages.length === 0) {
      toast.error("Please select at least one page to display this review on");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create one review per selected page so each page can manage them independently
      await Promise.all(
        selectedPages.map((page) =>
          axios.post(
            `${API}/dashboard/reviews?email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`,
            { ...formData, page }
          )
        )
      );
      toast.success(
        selectedPages.length > 1
          ? `Review added to ${selectedPages.length} pages!`
          : "Review added successfully!"
      );
      onReviewAdded();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Add New Review" large>
      <form onSubmit={handleSubmit} className="space-y-5" data-testid="add-review-form">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Priya Sharma"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
              data-testid="review-input-name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Country *</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="e.g. Canada"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
              data-testid="review-input-country"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Photo (optional)</label>
          <div className="flex items-center gap-4">
            <label
              className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors text-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              data-testid="review-photo-upload"
            >
              <Upload size={18} className="text-slate-500" />
              <span className="text-slate-600">{isUploading ? "Uploading..." : "Choose Photo"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
                data-testid="review-input-image-file"
              />
            </label>
            {(imagePreview || formData.image_url) && (
              <div className="relative">
                <img
                  src={imagePreview || formData.image_url}
                  alt="Preview"
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-200"
                />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setFormData({ ...formData, image_url: "" }); }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Max 5MB. JPEG, PNG, WebP or GIF</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Review Content *</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Write the student's review..."
            rows={4}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm resize-none"
            data-testid="review-input-content"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="p-1"
                  data-testid={`review-star-${star}`}
                >
                  <Star
                    size={24}
                    className={star <= formData.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Display On Pages <span className="text-slate-400 font-normal">(select one or more)</span>
            </label>
            <div className="space-y-2">
              {PAGE_OPTIONS.map((opt) => {
                const checked = selectedPages.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                      checked
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                    data-testid={`review-page-option-${opt.value}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePage(opt.value)}
                      className="w-4 h-4 accent-amber-500"
                      data-testid={`review-page-checkbox-${opt.value}`}
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="review-submit-btn"
          >
            {isSubmitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {isSubmitting ? "Adding..." : "Add Review"}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// ==================== WHATSAPP TEMPLATES MANAGER ====================
const PLACEHOLDER_OPTIONS = [
  { value: "name", label: "{name} — First name of lead" },
  { value: "full_name", label: "{full_name} — Full name" },
  { value: "city", label: "{city} — Lead's home city" },
  { value: "preferred_city", label: "{preferred_city} — Fair location chosen (e.g. Jammu)" },
  { value: "preferred_branch", label: "{preferred_branch} — Branch chosen for offline visit" },
  { value: "branch_address", label: "{branch_address} — Full address of chosen branch" },
  { value: "branch_phone", label: "{branch_phone} — Phone number of chosen branch" },
  { value: "branch_contact_name", label: "{branch_contact_name} — e.g. Team Visaxpert Ludhiana" },
  { value: "counselling_mode", label: "{counselling_mode} — online / offline" },
  { value: "event_date", label: "{event_date} — Fair date (e.g. 25th May 2026)" },
  { value: "phone", label: "{phone} — Phone number" },
];

const CATEGORY_OPTIONS = [
  { value: "germany_fair", label: "Germany Fair" },
  { value: "main_online", label: "Main Page - Online Counselling" },
  { value: "main_offline", label: "Main Page - Offline Counselling" },
];

const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});

const TRIGGER_LABELS = {
  immediate: "Immediately (on form submit)",
  fraction: "Auto-spread to event",
  days_before: "X days before event",
  same_day: "On event day",
};

function WhatsAppManager({ credentials }) {
  const [templates, setTemplates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("templates"); // templates | messages
  const [statusFilter, setStatusFilter] = useState("");
  const [gfTestMode, setGfTestMode] = useState(false);
  const [gfTestToggling, setGfTestToggling] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoadingTpl(true);
    try {
      const { data } = await axios.get(`${API}/dashboard/whatsapp/templates`, {
        params: credentials,
      });
      setTemplates(data.templates || []);
    } catch (e) {
      toast.error("Failed to load templates");
    } finally {
      setLoadingTpl(false);
    }
  }, [credentials]);

  const fetchMessages = useCallback(async () => {
    setLoadingMsgs(true);
    try {
      const params = { ...credentials, limit: 200 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get(`${API}/dashboard/whatsapp/messages`, { params });
      setMessages(data.messages || []);
    } catch (e) {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMsgs(false);
    }
  }, [credentials, statusFilter]);

  const fetchGfTestMode = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/dashboard/whatsapp/gf-test-mode`, {
        params: credentials,
      });
      setGfTestMode(!!data.enabled);
    } catch {
      /* ignore */
    }
  }, [credentials]);

  useEffect(() => {
    fetchTemplates();
    fetchMessages();
    fetchGfTestMode();
  }, [fetchTemplates, fetchMessages, fetchGfTestMode]);

  const toggleGfTestMode = async () => {
    const next = !gfTestMode;
    if (next && !window.confirm(
      "Enable Germany Fair TEST mode?\n\nEvery new germany_fair lead will receive all 6 WhatsApp messages 20 minutes apart, ignoring the real schedule. Turn OFF before going live."
    )) return;
    setGfTestToggling(true);
    try {
      await axios.post(
        `${API}/dashboard/whatsapp/gf-test-mode`,
        { enabled: next },
        { params: credentials }
      );
      setGfTestMode(next);
      toast.success(next ? "GF Test mode ENABLED (20-min gaps)" : "GF Test mode disabled");
    } catch {
      toast.error("Failed to toggle");
    } finally {
      setGfTestToggling(false);
    }
  };

  const handleDelete = async (template_id) => {
    if (!window.confirm("Delete this template? Pending scheduled messages will be cancelled.")) return;
    try {
      await axios.delete(`${API}/dashboard/whatsapp/templates/${template_id}`, {
        params: credentials,
      });
      toast.success("Template deleted");
      fetchTemplates();
      fetchMessages();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleRetry = async (msg_id) => {
    try {
      await axios.post(`${API}/dashboard/whatsapp/messages/${msg_id}/retry`, {}, {
        params: credentials,
      });
      toast.success("Message queued for retry");
      fetchMessages();
    } catch {
      toast.error("Retry failed");
    }
  };

  const handleCancel = async (msg_id) => {
    if (!window.confirm("Cancel this pending message?")) return;
    try {
      await axios.delete(`${API}/dashboard/whatsapp/messages/${msg_id}`, {
        params: credentials,
      });
      toast.success("Message cancelled");
      fetchMessages();
    } catch {
      toast.error("Cancel failed");
    }
  };

  const handleSeedGF = async () => {
    if (!window.confirm("Create 6 draft Germany Fair templates (1 immediate + 4 days-before + 1 on-event-day)?\n\nThey'll be INACTIVE — just edit each one, paste the AiSensy campaign name, and flip Active on.")) return;
    try {
      const { data } = await axios.post(
        `${API}/dashboard/whatsapp/seed-germany-fair`,
        {},
        { params: credentials }
      );
      if (data.success) {
        toast.success(`Created ${data.created} draft templates. Edit each to set the AiSensy campaign name.`);
        fetchTemplates();
      } else {
        toast.error(data.message || "Seed skipped");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Seed failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="whatsapp-manager">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">WhatsApp Config</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage message templates and scheduled sends for every lead flow (Main Page Online / Offline, Germany Fair)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setView("templates")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${view === "templates" ? "bg-white text-green-700 shadow-sm" : "text-slate-600"}`}
              data-testid="wa-view-templates"
            >Templates</button>
            <button
              onClick={() => setView("messages")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${view === "messages" ? "bg-white text-green-700 shadow-sm" : "text-slate-600"}`}
              data-testid="wa-view-messages"
            >Message Log</button>
          </div>
          {view === "templates" && (
            <>
              <button
                onClick={toggleGfTestMode}
                disabled={gfTestToggling}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border transition-colors ${gfTestMode
                  ? "bg-rose-500 border-rose-500 text-white hover:bg-rose-600"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                data-testid="wa-gf-test-mode-toggle"
                title="Germany Fair: when ON, every lead gets all 6 messages 1 min apart"
              >
                <span className={`w-2 h-2 rounded-full ${gfTestMode ? "bg-white animate-pulse" : "bg-slate-300"}`}></span>
                GF Test Mode: {gfTestMode ? "ON" : "OFF"}
              </button>
              <button
                onClick={handleSeedGF}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium shadow-sm"
                data-testid="wa-seed-gf-btn"
                title="Create 6 Germany Fair draft templates you just need to name"
              >
                <Sparkles size={16} /> Seed Germany Fair (6)
              </button>
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium shadow-sm"
                data-testid="wa-new-template-btn"
              >
                <Plus size={16} /> New Template
              </button>
            </>
          )}
          <button
            onClick={() => { fetchTemplates(); fetchMessages(); }}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            data-testid="wa-refresh-btn"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {view === "templates" ? (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="font-medium mb-1">How it works</p>
            <ul className="list-disc pl-5 space-y-1 text-blue-800">
              <li>Each template is tied to a <strong>Category</strong> that picks which lead flow it fires on:
                <code className="bg-white px-1 rounded mx-1">Main Page - Online</code>,
                <code className="bg-white px-1 rounded mx-1">Main Page - Offline</code>, or
                <code className="bg-white px-1 rounded mx-1">Germany Fair</code>.
              </li>
              <li>Main-page templates send <strong>immediately</strong> after the form submit; Germany Fair supports scheduled days-before / on-event reminders.</li>
              <li><strong>Campaign name</strong> must exactly match a <em>live campaign</em> created in your AiSensy dashboard (attached to an approved template).</li>
              <li>Body parameters fill the template's <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> etc. in order.</li>
              <li>Use <code>static:your text</code> to pass a literal string.</li>
            </ul>
          </div>

          {loadingTpl ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <MessageCircle size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No templates yet</p>
              <p className="text-slate-400 text-sm mt-1">Create one to start sending automated messages</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((t) => (
                <div key={t.template_id}
                  className={`bg-white rounded-xl border p-5 ${t.active ? "border-slate-200" : "border-red-200 bg-red-50/30"}`}
                  data-testid={`wa-template-${t.template_id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-semibold text-slate-900">{t.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          {CATEGORY_LABELS[t.category || "germany_fair"] || t.category || "Germany Fair"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {t.wa_template_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {TRIGGER_LABELS[t.trigger_type] || t.trigger_type}
                          {t.trigger_type === "days_before" ? ` (${t.days_before}d)` : ""}
                          {t.trigger_type === "fraction" ? ` (${Math.round((t.fraction || 0.5) * 100)}%)` : ""}
                        </span>
                        {t.header_media_url && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.header_media_type === "video" ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"}`}>
                            {t.header_media_type === "video" ? "Video" : "Image"}
                          </span>
                        )}
                        {!t.active && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        Lang: <span className="font-mono">{t.language_code}</span>
                        {"  •  Send @ "}{String(t.send_hour_utc).padStart(2, "0")}:{String(t.send_minute_utc ?? 0).padStart(2, "0")} UTC
                      </p>
                      {(t.body_params || []).length > 0 && (
                        <div className="text-xs text-slate-600">
                          <span className="font-medium">Body params:</span>{" "}
                          {t.body_params.map((p, i) => (
                            <code key={i} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded mr-1 font-mono text-[11px]">
                              {`{{${i + 1}}}`} = {p}
                            </code>
                          ))}
                        </div>
                      )}
                      {t.header_param && (
                        <div className="text-xs text-slate-600 mt-1">
                          <span className="font-medium">Header:</span>{" "}
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">{t.header_param}</code>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditing(t); setShowForm(true); }}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        data-testid={`wa-edit-${t.template_id}`}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.template_id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        data-testid={`wa-delete-${t.template_id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              data-testid="wa-msg-status-filter"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="sending">Sending</option>
            </select>
            <span className="text-sm text-slate-500">{messages.length} message(s)</span>
          </div>
          {loadingMsgs ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Send size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No messages in queue</p>
              <p className="text-slate-400 text-sm mt-1">Messages are scheduled automatically on Germany Fair lead submission</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Phone</th>
                    <th className="text-left px-3 py-2">Template</th>
                    <th className="text-left px-3 py-2">City</th>
                    <th className="text-left px-3 py-2">Scheduled</th>
                    <th className="text-left px-3 py-2">Sent / Error</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => {
                    const statusPill = {
                      pending: "bg-yellow-100 text-yellow-700",
                      sending: "bg-blue-100 text-blue-700",
                      sent: "bg-green-100 text-green-700",
                      failed: "bg-red-100 text-red-700",
                      cancelled: "bg-slate-200 text-slate-600",
                    }[m.status] || "bg-slate-100 text-slate-600";
                    return (
                      <tr key={m.msg_id} className="border-t border-slate-100" data-testid={`wa-msg-${m.msg_id}`}>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusPill}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{m.phone}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{m.template_display_name}</div>
                          <div className="text-xs text-slate-500">{m.wa_template_name}</div>
                        </td>
                        <td className="px-3 py-2">{m.preferred_city || "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {m.status === "sent" && m.sent_at ? (
                            <span className="text-green-700">{new Date(m.sent_at).toLocaleString()}</span>
                          ) : m.status === "failed" && m.error ? (
                            <span className="text-red-700 break-all">{String(m.error).slice(0, 100)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {m.status === "failed" || m.status === "cancelled" ? (
                            <button
                              onClick={() => handleRetry(m.msg_id)}
                              className="text-xs text-blue-600 hover:underline"
                              data-testid={`wa-retry-${m.msg_id}`}
                            >Retry</button>
                          ) : m.status === "pending" ? (
                            <button
                              onClick={() => handleCancel(m.msg_id)}
                              className="text-xs text-red-600 hover:underline"
                              data-testid={`wa-cancel-${m.msg_id}`}
                            >Cancel</button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <WhatsAppTemplateForm
          credentials={credentials}
          template={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchTemplates(); }}
        />
      )}
    </div>
  );
}

function WhatsAppTemplateForm({ credentials, template, onClose, onSaved }) {
  const isEdit = !!template;
  const [form, setForm] = useState(() => ({
    name: template?.name || "",
    wa_template_name: template?.wa_template_name || "",
    language_code: template?.language_code || "en",
    body_params: template?.body_params || [],
    header_param: template?.header_param || "",
    trigger_type: template?.trigger_type || "immediate",
    days_before: template?.days_before ?? 1,
    fraction: template?.fraction ?? 0.5,
    send_hour_utc: template?.send_hour_utc ?? 4,
    send_minute_utc: template?.send_minute_utc ?? 30,
    active: template?.active ?? true,
    category: template?.category || "main_online",
    header_media_url: template?.header_media_url || "",
    header_media_type: template?.header_media_type || "",
  }));
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const addBodyParam = () => setForm({ ...form, body_params: [...form.body_params, "name"] });
  const updateBodyParam = (i, v) => {
    const arr = [...form.body_params];
    arr[i] = v;
    setForm({ ...form, body_params: arr });
  };
  const removeBodyParam = (i) => {
    const arr = form.body_params.filter((_, idx) => idx !== i);
    setForm({ ...form, body_params: arr });
  };

  const handleMediaUpload = async (file) => {
    if (!file) return;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(
        `${API}/dashboard/whatsapp/upload-media`,
        formData,
        { params: credentials, headers: { "Content-Type": "multipart/form-data" } }
      );
      setForm((f) => ({
        ...f,
        header_media_url: data.media_url,
        header_media_type: data.media_type,
      }));
      toast.success(`${data.media_type === "video" ? "Video" : "Image"} uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = () => {
    setForm((f) => ({ ...f, header_media_url: "", header_media_type: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.wa_template_name.trim()) {
      toast.error("Name and WhatsApp template name are required");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      header_param: form.header_param ? form.header_param : null,
      days_before: Number(form.days_before) || 0,
      fraction: Number(form.fraction) || 0,
      send_hour_utc: Number(form.send_hour_utc) || 0,
      send_minute_utc: Number(form.send_minute_utc) || 0,
      header_media_url: form.header_media_url || null,
      header_media_type: form.header_media_type || null,
    };
    try {
      if (isEdit) {
        await axios.patch(`${API}/dashboard/whatsapp/templates/${template.template_id}`, payload, {
          params: credentials,
        });
        toast.success("Template updated");
      } else {
        await axios.post(`${API}/dashboard/whatsapp/templates`, payload, {
          params: credentials,
        });
        toast.success("Template created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!isEdit) {
      toast.error("Save the template first before testing");
      return;
    }
    if (!testPhone.trim()) {
      toast.error("Enter a test phone number");
      return;
    }
    setTesting(true);
    try {
      const { data } = await axios.post(
        `${API}/dashboard/whatsapp/test`,
        { template_id: template.template_id, phone: testPhone, name: "Test User", preferred_city: "Jammu" },
        { params: credentials }
      );
      if (data.result?.ok) {
        toast.success("Test message sent");
      } else {
        toast.error(`Send failed: ${data.result?.error || "Unknown"}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal onClose={onClose} title={isEdit ? "Edit Template" : "New WhatsApp Template"} large>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
          <select
            value={form.category}
            onChange={(e) => {
              const newCat = e.target.value;
              // main_* categories only use immediate trigger
              const newTrigger = newCat === "germany_fair" ? form.trigger_type : "immediate";
              setForm({ ...form, category: newCat, trigger_type: newTrigger });
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            data-testid="wa-form-category"
          >
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Chooses which lead flow fires this template.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
            <input
              type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Reminder 3 Days Before"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              data-testid="wa-form-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              AiSensy Campaign Name *
            </label>
            <input
              type="text" value={form.wa_template_name}
              onChange={(e) => setForm({ ...form, wa_template_name: e.target.value })}
              placeholder="e.g. main_online_welcome"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              data-testid="wa-form-wa-name"
            />
            <p className="text-xs text-slate-400 mt-1">Must exactly match a live campaign in your AiSensy dashboard</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Language Code</label>
            <input
              type="text" value={form.language_code}
              onChange={(e) => setForm({ ...form, language_code: e.target.value })}
              placeholder="en"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              data-testid="wa-form-lang"
            />
          </div>
          <div className="flex items-center gap-3 mt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                data-testid="wa-form-active"
              />
              <span className="text-sm text-slate-700">Active (send on new leads)</span>
            </label>
          </div>
        </div>

        {form.category === "germany_fair" ? (
          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">When to send</label>
            <div className="grid md:grid-cols-3 gap-3">
              <select
                value={form.trigger_type}
                onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                data-testid="wa-form-trigger"
              >
                <option value="immediate">Immediately on signup</option>
                <option value="fraction">Auto-spread between signup &amp; event</option>
                <option value="days_before">X days before event</option>
                <option value="same_day">On the event day</option>
              </select>
              {form.trigger_type === "days_before" && (
                <input
                  type="number" min="0" max="30" value={form.days_before}
                  onChange={(e) => setForm({ ...form, days_before: e.target.value })}
                  placeholder="Days before"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  data-testid="wa-form-days"
                />
              )}
              {form.trigger_type === "fraction" && (
                <select
                  value={form.fraction}
                  onChange={(e) => setForm({ ...form, fraction: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  data-testid="wa-form-fraction"
                >
                  <option value="0.25">25% of the way to event</option>
                  <option value="0.5">50% of the way to event</option>
                  <option value="0.75">75% of the way to event</option>
                </select>
              )}
              {form.trigger_type !== "immediate" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="23" value={form.send_hour_utc}
                    onChange={(e) => setForm({ ...form, send_hour_utc: e.target.value })}
                    className="px-2 py-2 border border-slate-200 rounded-lg text-sm w-16"
                    data-testid="wa-form-hour"
                  />
                  <span className="text-xs text-slate-400">:</span>
                  <input
                    type="number" min="0" max="59" value={form.send_minute_utc}
                    onChange={(e) => setForm({ ...form, send_minute_utc: e.target.value })}
                    className="px-2 py-2 border border-slate-200 rounded-lg text-sm w-16"
                    data-testid="wa-form-minute"
                  />
                  <span className="text-xs text-slate-500">UTC (4:30 ≈ 10:00 IST)</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="font-medium">Trigger:</span> Sends immediately when the user submits the main landing page form.
            </p>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Header Media (optional — image or video)
          </label>
          {form.header_media_url ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {form.header_media_type === "video" ? (
                <video
                  src={form.header_media_url}
                  className="w-24 h-24 rounded object-cover bg-black"
                  controls
                />
              ) : (
                <img
                  src={form.header_media_url}
                  alt="header"
                  className="w-24 h-24 rounded object-cover border border-slate-200"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 uppercase font-medium">
                  {form.header_media_type || "media"}
                </p>
                <p className="text-xs text-slate-600 font-mono truncate">
                  {form.header_media_url}
                </p>
              </div>
              <button
                type="button"
                onClick={removeMedia}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                data-testid="wa-form-media-remove"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-6 cursor-pointer transition-colors ${uploadingMedia ? "border-slate-300 bg-slate-50" : "border-slate-300 hover:border-green-400 hover:bg-green-50/40"}`}>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                disabled={uploadingMedia}
                onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                data-testid="wa-form-media-upload"
              />
              <div className="text-sm text-slate-600">
                {uploadingMedia ? "Uploading…" : "Click to upload image or video"}
              </div>
              <div className="text-xs text-slate-400">
                JPEG/PNG/WEBP/GIF (&lt;5MB) or MP4/MOV/3GP/WEBM (&lt;16MB)
              </div>
            </label>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Body Parameters ({'{{1}}'}, {'{{2}}'}, …)
            </label>
            <button
              type="button" onClick={addBodyParam}
              className="text-xs text-green-600 hover:underline flex items-center gap-1"
              data-testid="wa-form-add-param"
            >
              <Plus size={12} /> Add parameter
            </button>
          </div>
          {form.body_params.length === 0 && (
            <p className="text-xs text-slate-400">No body parameters. Add one if your template has placeholders.</p>
          )}
          <div className="space-y-2">
            {form.body_params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono w-10">{`{{${i + 1}}}`}</span>
                <select
                  value={PLACEHOLDER_OPTIONS.some(o => o.value === p) ? p : "__static"}
                  onChange={(e) => {
                    if (e.target.value === "__static") updateBodyParam(i, "static:");
                    else updateBodyParam(i, e.target.value);
                  }}
                  className="px-2 py-1.5 border border-slate-200 rounded text-sm"
                  data-testid={`wa-form-param-select-${i}`}
                >
                  {PLACEHOLDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  <option value="__static">static: custom text</option>
                </select>
                {(p.startsWith("static:") || (!PLACEHOLDER_OPTIONS.some(o => o.value === p))) && (
                  <input
                    type="text" value={p.replace(/^static:/, "")}
                    onChange={(e) => updateBodyParam(i, "static:" + e.target.value)}
                    placeholder="Custom static text"
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                    data-testid={`wa-form-param-input-${i}`}
                  />
                )}
                <button
                  type="button" onClick={() => removeBodyParam(i)}
                  className="p-1.5 text-slate-400 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Header Parameter (optional)
          </label>
          <select
            value={form.header_param && PLACEHOLDER_OPTIONS.some(o => o.value === form.header_param) ? form.header_param : (form.header_param?.startsWith("static:") ? "__static" : "")}
            onChange={(e) => {
              if (e.target.value === "") setForm({ ...form, header_param: "" });
              else if (e.target.value === "__static") setForm({ ...form, header_param: "static:" });
              else setForm({ ...form, header_param: e.target.value });
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            data-testid="wa-form-header"
          >
            <option value="">— None —</option>
            {PLACEHOLDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            <option value="__static">static: custom text</option>
          </select>
          {form.header_param?.startsWith("static:") && (
            <input
              type="text" value={form.header_param.replace(/^static:/, "")}
              onChange={(e) => setForm({ ...form, header_param: "static:" + e.target.value })}
              placeholder="Header custom text"
              className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          )}
        </div>

        {isEdit && (
          <div className="border-t border-slate-200 pt-4 bg-slate-50 -mx-6 px-6 -mb-1 pb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Send Test Message</label>
            <div className="flex gap-2">
              <input
                type="text" value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="e.g. 919876543210 (10 or 12 digits)"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                data-testid="wa-form-test-phone"
              />
              <button
                type="button" onClick={handleTest} disabled={testing}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                data-testid="wa-form-test-btn"
              >
                <Send size={14} /> {testing ? "Sending…" : "Send Test"}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test uses sample values (name=Test User, city=Jammu). Requires a live AiSensy campaign with this exact name.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <button
            type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium"
          >Cancel</button>
          <button
            type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="wa-form-submit"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {saving ? "Saving…" : isEdit ? "Update Template" : "Create Template"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ==================== LOGOS MANAGER ====================
const PAGE_DEFS = [
  { key: "main", label: "Main Landing Page", route: "/" },
  { key: "germany_fair", label: "Germany Fair Page", route: "/germany-fair" },
  { key: "university_change", label: "University Change Page", route: "/university-change" },
];
const DEFAULT_LOGO_URL = "/assets/visaxpert-logo.png";

function LogosManager({ credentials }) {
  const [logos, setLogos] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);

  const fetchLogos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/page-logos`);
      setLogos(data || {});
    } catch {
      toast.error("Failed to load logos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogos(); }, [fetchLogos]);

  const handleUpload = async (pageKey, file) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Logo must be under 3MB");
      return;
    }
    setUploadingFor(pageKey);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`${API}/dashboard/page-logos/upload`, formData, {
        params: { ...credentials, page: pageKey },
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Logo uploaded for ${pageKey.replace("_", " ")}`);
      fetchLogos();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingFor(null);
    }
  };

  const handleReset = async (pageKey) => {
    if (!window.confirm(`Reset ${pageKey.replace("_", " ")} logo to default?`)) return;
    try {
      await axios.delete(`${API}/dashboard/page-logos/${pageKey}`, { params: credentials });
      toast.success("Reset to default logo");
      fetchLogos();
    } catch {
      toast.error("Reset failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="logos-manager">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Page Logos</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload a custom logo for each landing page. Leave empty to use the default.
          Recommended size: 400×100 px (PNG/SVG with transparent background). Max 3MB.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAGE_DEFS.map((p) => {
            const currentUrl = logos[p.key] || DEFAULT_LOGO_URL;
            const isCustom = !!logos[p.key];
            const isUploading = uploadingFor === p.key;
            return (
              <div
                key={p.key}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col"
                data-testid={`logo-card-${p.key}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{p.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{p.route}</span>
                    </p>
                  </div>
                  {isCustom && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                      Custom
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-6 flex items-center justify-center min-h-[100px] mb-3 border border-slate-100">
                  <img
                    src={currentUrl}
                    alt={p.label}
                    className="max-h-16 max-w-full object-contain"
                    onError={(e) => { e.target.src = DEFAULT_LOGO_URL; }}
                  />
                </div>

                <div className="mt-auto space-y-2">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={(e) => handleUpload(p.key, e.target.files?.[0])}
                      disabled={isUploading}
                      className="hidden"
                      data-testid={`logo-file-${p.key}`}
                    />
                    <span className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg cursor-pointer text-sm font-medium ${isUploading ? "bg-slate-100 text-slate-400" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                      {isUploading ? (
                        <><RefreshCw size={14} className="animate-spin" /> Uploading…</>
                      ) : (
                        <><Upload size={14} /> {isCustom ? "Replace Logo" : "Upload Logo"}</>
                      )}
                    </span>
                  </label>
                  {isCustom && (
                    <button
                      onClick={() => handleReset(p.key)}
                      className="w-full px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium"
                      data-testid={`logo-reset-${p.key}`}
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ==================== PARTNER LOGOS MANAGER ====================
function PartnerLogosManager({ credentials }) {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pageFilter, setPageFilter] = useState("all");

  const fetchLogos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/dashboard/partner-logos`, { params: credentials });
      setLogos(data.logos || []);
    } catch {
      toast.error("Failed to load partner logos");
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => { fetchLogos(); }, [fetchLogos]);

  const handleToggle = async (logo_id) => {
    try {
      await axios.patch(`${API}/dashboard/partner-logos/${logo_id}/toggle`, null, { params: credentials });
      toast.success("Logo visibility updated");
      fetchLogos();
    } catch {
      toast.error("Failed to toggle logo");
    }
  };

  const handleDelete = async (logo_id) => {
    if (!window.confirm("Delete this logo?")) return;
    try {
      await axios.delete(`${API}/dashboard/partner-logos/${logo_id}`, { params: credentials });
      toast.success("Logo deleted");
      fetchLogos();
    } catch {
      toast.error("Failed to delete logo");
    }
  };

  const pageBadge = (page) => {
    if (page === "main") return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">Main</span>;
    if (page === "university_change") return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-700">Uni Change</span>;
    if (page === "germany_fair") return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Germany Fair</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">{page}</span>;
  };

  return (
    <div className="space-y-6" data-testid="partner-logos-manager">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Partner Logos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload partner / university logos that appear in the sliding carousel on each page.
            Each logo can be assigned to one or more pages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            data-testid="partner-logos-page-filter"
          >
            <option value="all">All pages</option>
            {PAGE_DEFS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium"
            data-testid="add-partner-logo-btn"
          >
            <Plus size={16} /> Upload Logo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Loading…</div>
      ) : (() => {
        const visibleLogos = pageFilter === "all"
          ? logos
          : logos.filter((l) => (l.pages || []).includes(pageFilter));
        if (visibleLogos.length === 0) {
          return (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <ImageIcon size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-lg">
                {pageFilter === "all" ? "No partner logos yet" : "No logos for this page yet"}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {pageFilter === "all"
                  ? "Upload your first logo — it will appear in the sliding carousel on the selected pages."
                  : "Upload a logo and tick this page to show it here."}
              </p>
            </div>
          );
        }
        return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleLogos.map((logo) => (
            <div
              key={logo.logo_id}
              className={`bg-white rounded-xl border p-4 flex flex-col ${logo.is_active ? "border-slate-200" : "border-red-200 bg-red-50/30"}`}
              data-testid={`partner-logo-card-${logo.logo_id}`}
            >
              <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-center min-h-[100px] mb-3 border border-slate-100">
                <img
                  src={logo.logo_url.replace(/^\/assets\/uploads\//, "/api/uploads/")}
                  alt={logo.name}
                  className="max-h-20 max-w-full object-contain"
                />
              </div>
              <p className="font-medium text-slate-900 text-sm truncate" title={logo.name}>{logo.name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(logo.pages || []).map((p) => <span key={p}>{pageBadge(p)}</span>)}
              </div>
              {!logo.is_active && <p className="text-red-500 text-xs mt-2 font-medium">Hidden</p>}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleToggle(logo.logo_id)}
                  className={`flex-1 p-2 rounded-lg transition-colors text-xs font-medium ${logo.is_active ? "text-green-700 bg-green-50 hover:bg-green-100" : "text-slate-500 bg-slate-100 hover:bg-slate-200"}`}
                  title={logo.is_active ? "Hide logo" : "Show logo"}
                  data-testid={`toggle-partner-logo-${logo.logo_id}`}
                >
                  {logo.is_active ? "Visible" : "Hidden"}
                </button>
                <button
                  onClick={() => handleDelete(logo.logo_id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  data-testid={`delete-partner-logo-${logo.logo_id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        );
      })()}

      {showAdd && (
        <AddPartnerLogoModal
          onClose={() => setShowAdd(false)}
          credentials={credentials}
          defaultPage={pageFilter !== "all" ? pageFilter : "main"}
          onLogoAdded={() => { fetchLogos(); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function AddPartnerLogoModal({ onClose, credentials, onLogoAdded, defaultPage = "main" }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedPages, setSelectedPages] = useState([defaultPage]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PAGE_OPTIONS = [
    { value: "main", label: "Main Landing Page" },
    { value: "university_change", label: "University Change Page" },
    { value: "germany_fair", label: "Germany Fair Page" },
  ];

  const togglePage = (value) => {
    setSelectedPages((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      toast.error("Logo must be under 3MB");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please choose a logo image"); return; }
    if (!name.trim()) { toast.error("Please enter a name for this logo"); return; }
    if (selectedPages.length === 0) { toast.error("Select at least one page"); return; }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      fd.append("pages", selectedPages.join(","));
      await axios.post(`${API}/dashboard/partner-logos`, fd, {
        params: credentials,
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        selectedPages.length > 1
          ? `Logo added to ${selectedPages.length} pages!`
          : "Logo added successfully!"
      );
      onLogoAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload logo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Upload Partner Logo" large>
      <form onSubmit={handleSubmit} className="space-y-5" data-testid="add-partner-logo-form">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Name / University *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Technical University of Munich"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
            data-testid="partner-logo-input-name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo Image *</label>
          <div className="flex items-center gap-4">
            <label
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm"
              data-testid="partner-logo-upload"
            >
              <Upload size={18} className="text-slate-500" />
              <span className="text-slate-600">{file ? file.name : "Choose Logo"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
                data-testid="partner-logo-input-file"
              />
            </label>
            {preview && (
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <img src={preview} alt="Preview" className="h-12 max-w-[120px] object-contain" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">PNG / SVG with transparent background works best. Max 3MB.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Display On Pages <span className="text-slate-400 font-normal">(select one or more)</span>
          </label>
          <div className="grid sm:grid-cols-3 gap-2">
            {PAGE_OPTIONS.map((opt) => {
              const checked = selectedPages.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${checked ? "border-purple-400 bg-purple-50" : "border-slate-200 hover:bg-slate-50"}`}
                  data-testid={`partner-logo-page-option-${opt.value}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePage(opt.value)}
                    className="w-4 h-4 accent-purple-500"
                    data-testid={`partner-logo-page-checkbox-${opt.value}`}
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium"
          >Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="partner-logo-submit-btn"
          >
            {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            {isSubmitting ? "Uploading…" : "Upload Logo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ==================== ANNIVERSARY SUCCESS STORIES MANAGER ====================
// Manages student visa photos shown on /ielts-celebration (and optionally other pages)
function SuccessStoriesManager({ credentials }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/dashboard/success-stories`, { params: credentials });
      setStories(data.stories || []);
    } catch {
      toast.error("Failed to load success stories");
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleToggle = async (story_id) => {
    try {
      await axios.patch(`${API}/dashboard/success-stories/${story_id}/toggle`, null, { params: credentials });
      toast.success("Story visibility updated");
      fetchStories();
    } catch {
      toast.error("Failed to toggle story");
    }
  };

  const handleDelete = async (story_id) => {
    if (!window.confirm("Delete this student photo?")) return;
    try {
      await axios.delete(`${API}/dashboard/success-stories/${story_id}`, { params: credentials });
      toast.success("Story deleted");
      fetchStories();
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const pageBadge = (page) => {
    if (page === "ielts_celebration") return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-700">IELTS Celebration</span>;
    if (page === "main") return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">Main</span>;
    if (page === "university_change") return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-700">Uni Change</span>;
    if (page === "germany_fair") return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Germany Fair</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">{page}</span>;
  };

  return (
    <div className="space-y-6" data-testid="success-stories-manager">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={20} className="text-rose-500" /> Anniversary Success Stories
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Upload student visa photos that appear in the &ldquo;Real students. Real visas.&rdquo; gallery on
            the <code className="px-1.5 py-0.5 rounded bg-slate-100 text-rose-600 text-xs">/ielts-celebration</code> landing page.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium"
          data-testid="add-success-story-btn"
        >
          <Plus size={16} /> Upload Student Photo
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Loading…</div>
      ) : stories.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-rose-200 p-10 text-center">
          <ImageIcon size={36} className="mx-auto text-rose-300 mb-3" />
          <p className="text-slate-600 text-lg">No student photos yet</p>
          <p className="text-slate-400 text-sm mt-1">Upload your first success-story image — it will appear in the celebration gallery.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stories.map((s) => (
            <div
              key={s.story_id}
              className={`bg-white rounded-xl border p-3 flex flex-col ${s.is_active ? "border-slate-200" : "border-red-200 bg-red-50/30"}`}
              data-testid={`success-story-card-${s.story_id}`}
            >
              <div className="rounded-lg overflow-hidden border border-slate-100 aspect-[3/4] mb-3 bg-slate-50">
                <img
                  src={(s.image_url || "").startsWith("http") ? s.image_url : `${BACKEND_URL}${s.image_url}`}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="font-medium text-slate-900 text-sm truncate" title={s.name}>{s.name}</p>
              {s.caption && <p className="text-xs text-rose-600 font-semibold truncate" title={s.caption}>{s.caption}</p>}
              <div className="flex flex-wrap gap-1 mt-2">
                {(s.pages || []).map((p) => <span key={p}>{pageBadge(p)}</span>)}
              </div>
              {!s.is_active && <p className="text-red-500 text-xs mt-2 font-medium">Hidden</p>}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleToggle(s.story_id)}
                  className={`flex-1 p-2 rounded-lg transition-colors text-xs font-medium ${s.is_active ? "text-green-700 bg-green-50 hover:bg-green-100" : "text-slate-500 bg-slate-100 hover:bg-slate-200"}`}
                  data-testid={`toggle-success-story-${s.story_id}`}
                >
                  {s.is_active ? "Visible" : "Hidden"}
                </button>
                <button
                  onClick={() => handleDelete(s.story_id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  data-testid={`delete-success-story-${s.story_id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddSuccessStoryModal
          onClose={() => setShowAdd(false)}
          credentials={credentials}
          onStoryAdded={() => { fetchStories(); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function AddSuccessStoryModal({ onClose, credentials, onStoryAdded }) {
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedPages, setSelectedPages] = useState(["ielts_celebration"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PAGE_OPTIONS = [
    { value: "ielts_celebration", label: "IELTS Celebration (anniversary)" },
    { value: "main", label: "Main Landing Page" },
    { value: "university_change", label: "University Change Page" },
    { value: "germany_fair", label: "Germany Fair Page" },
  ];

  const togglePage = (value) => {
    setSelectedPages((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please choose an image"); return; }
    if (!name.trim()) { toast.error("Please enter the student's name"); return; }
    if (selectedPages.length === 0) { toast.error("Select at least one page"); return; }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      fd.append("caption", caption.trim());
      fd.append("pages", selectedPages.join(","));
      await axios.post(`${API}/dashboard/success-stories`, fd, {
        params: credentials,
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Student photo added!");
      onStoryAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Upload Student Success Photo" large>
      <form onSubmit={handleSubmit} className="space-y-5" data-testid="add-success-story-form">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none text-sm"
            data-testid="success-story-input-name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Caption <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Germany Student Visa — 2025"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none text-sm"
            data-testid="success-story-input-caption"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Photo *</label>
          <div className="flex items-center gap-4">
            <label
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-colors text-sm"
              data-testid="success-story-upload"
            >
              <Upload size={18} className="text-slate-500" />
              <span className="text-slate-600">{file ? file.name : "Choose Photo"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                data-testid="success-story-input-file"
              />
            </label>
            {preview && (
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <img src={preview} alt="Preview" className="h-16 max-w-[120px] object-cover rounded" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">JPEG / PNG / WebP. Portrait orientation works best. Max 5MB.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Display On Pages <span className="text-slate-400 font-normal">(select one or more)</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            {PAGE_OPTIONS.map((opt) => {
              const checked = selectedPages.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${checked ? "border-rose-400 bg-rose-50" : "border-slate-200 hover:bg-slate-50"}`}
                  data-testid={`success-story-page-option-${opt.value}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePage(opt.value)}
                    className="w-4 h-4 accent-rose-500"
                    data-testid={`success-story-page-checkbox-${opt.value}`}
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium"
          >Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="success-story-submit-btn"
          >
            {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            {isSubmitting ? "Uploading…" : "Upload Photo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}






// ==================== BOOKINGS MANAGER ====================

const WEEKDAYS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtBkTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function BookingsManager({ credentials }) {
  const [view, setView] = useState("slots"); // slots | bookings | clicks | settings

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">University-Change Bookings</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage consultation slots and bookings for the /university-change page.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setView("slots")}
            data-testid="bk-view-slots"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "slots" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Slots
          </button>
          <button
            onClick={() => setView("bookings")}
            data-testid="bk-view-bookings"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "bookings" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Bookings
          </button>
          <button
            onClick={() => setView("clicks")}
            data-testid="bk-view-clicks"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "clicks" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Campaign Clicks
          </button>
          <button
            onClick={() => setView("settings")}
            data-testid="bk-view-settings"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "settings" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Settings
          </button>
        </div>
      </div>

      {view === "slots" && <SlotsManager credentials={credentials} />}
      {view === "bookings" && <BookingsList credentials={credentials} />}
      {view === "clicks" && <UCClicksManager credentials={credentials} />}
      {view === "settings" && <BookingSettings credentials={credentials} />}
    </div>
  );
}

function UCClicksManager({ credentials }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState(""); // "", "whatsapp", "call"
  const [filterCampaign, setFilterCampaign] = useState("");

  const fetchClicks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...credentials, page: 1, per_page: 100 };
      if (filterType) params.click_type = filterType;
      if (filterCampaign.trim()) params.utm_campaign = filterCampaign.trim();
      const { data } = await axios.get(`${API}/dashboard/uc-click-events`, { params });
      setData(data);
    } catch (e) {
      toast.error("Failed to load click events");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [credentials, filterType, filterCampaign]);

  useEffect(() => { fetchClicks(); }, [fetchClicks]);

  const summary = data?.summary || [];
  const items = data?.items || [];

  const totalWa = summary.filter((s) => s.click_type === "whatsapp").reduce((a, b) => a + b.count, 0);
  const totalCall = summary.filter((s) => s.click_type === "call").reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-6" data-testid="uc-clicks-manager">
      <div>
        <p className="text-sm font-semibold text-slate-900">WhatsApp &amp; Call clicks from /berlin</p>
        <p className="text-xs text-slate-500 mt-1">
          Every click on the WhatsApp / Call buttons is logged with its UTM
          campaign so you can compare Meta ad sets side-by-side.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">WhatsApp clicks</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1" data-testid="uc-clicks-total-wa">{totalWa}</p>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-3">
          <p className="text-xs font-medium text-sky-700 uppercase tracking-wide">Call clicks</p>
          <p className="text-2xl font-bold text-sky-800 mt-1" data-testid="uc-clicks-total-call">{totalCall}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800 mb-2">By campaign</p>
        {summary.length === 0 ? (
          <p className="text-sm text-slate-500">No clicks yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Campaign</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-right px-3 py-2 font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.utm_campaign || "(no utm)"}</td>
                    <td className="px-3 py-2 text-slate-600 capitalize">{row.click_type}</td>
                    <td className="px-3 py-2 text-right text-slate-800 font-semibold">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          data-testid="uc-clicks-filter-type"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        >
          <option value="">All click types</option>
          <option value="whatsapp">WhatsApp only</option>
          <option value="call">Call only</option>
        </select>
        <input
          type="text"
          value={filterCampaign}
          onChange={(e) => setFilterCampaign(e.target.value)}
          placeholder="Filter by utm_campaign"
          data-testid="uc-clicks-filter-campaign"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
        <button
          type="button"
          onClick={fetchClicks}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800 mb-2">Recent clicks</p>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No clicks match the filters.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">When</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-left px-3 py-2 font-medium">Campaign</th>
                  <th className="text-left px-3 py-2 font-medium">Source / Medium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.slice(0, 100).map((it) => (
                  <tr key={it.click_id}>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {it.created_at ? new Date(it.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-800 capitalize">{it.click_type}</td>
                    <td className="px-3 py-2 text-slate-800">{it.utm_campaign || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {(it.utm_source || "—")}{it.utm_medium ? ` / ${it.utm_medium}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotsManager({ credentials }) {
  const [date, setDate] = useState(() => fmtIsoDate(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyTime, setBusyTime] = useState(null);

  const fetchDay = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/dashboard/uc-bookings/slots`, {
        params: { ...credentials, date },
      });
      setData(data);
    } catch (e) {
      toast.error("Failed to load slots for that date");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [credentials, date]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  const handleToggle = async (time, disabled) => {
    setBusyTime(time);
    try {
      await axios.post(
        `${API}/dashboard/uc-bookings/slots/toggle`,
        { date, time, disabled },
        { params: credentials },
      );
      toast.success(disabled ? `Slot ${fmtBkTime(time)} disabled` : `Slot ${fmtBkTime(time)} enabled`);
      await fetchDay();
    } catch (e) {
      toast.error("Failed to toggle slot");
    } finally {
      setBusyTime(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="text-sm font-medium text-slate-700">Date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          data-testid="bk-slots-date"
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
        <button
          type="button"
          onClick={fetchDay}
          data-testid="bk-slots-refresh"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !data || !data.working_day ? (
        <p className="text-sm text-slate-500">
          {data ? "Not a working day per current settings — no slots are offered on this date." : "No data."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.slots.map((s) => {
            const booked = !!s.booking;
            const disabled = s.disabled;
            return (
              <div
                key={s.time}
                data-testid={`admin-slot-${s.time}`}
                className={`rounded-xl border p-3 ${
                  booked
                    ? "border-blue-200 bg-blue-50"
                    : disabled
                    ? "border-slate-200 bg-slate-100"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900">{fmtBkTime(s.time)}</span>
                  {booked ? (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Booked
                    </span>
                  ) : disabled ? (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-500 text-white">
                      Disabled
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      Open
                    </span>
                  )}
                </div>
                {booked ? (
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <p className="font-medium truncate">{s.booking.name}</p>
                    <p className="text-slate-500 truncate">{s.booking.email}</p>
                    <p className="text-slate-500 truncate">{s.booking.phone}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyTime === s.time}
                    onClick={() => handleToggle(s.time, !disabled)}
                    data-testid={`admin-slot-toggle-${s.time}`}
                    className={`mt-1 w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      disabled
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {disabled ? (
                      <>
                        <ToggleRight size={14} /> Enable
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={14} /> Disable
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingsList({ credentials }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("confirmed");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...credentials };
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get(`${API}/dashboard/uc-bookings/list`, { params });
      setItems(data.items || []);
    } catch (e) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [credentials, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleCancel = async (booking_id) => {
    if (!window.confirm("Cancel this booking? The student's pending reminder emails will also be cancelled.")) return;
    try {
      await axios.post(`${API}/dashboard/uc-bookings/cancel/${booking_id}`, {}, { params: credentials });
      toast.success("Booking cancelled");
      await fetchList();
    } catch (e) {
      toast.error("Failed to cancel");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="text-sm font-medium text-slate-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="bk-list-status"
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        >
          <option value="">All</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="button"
          onClick={fetchList}
          data-testid="bk-list-refresh"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
        </button>
        <span className="text-xs text-slate-500 ml-auto">{items.length} booking(s)</span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No bookings found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" data-testid="bk-list-table">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">University</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.booking_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4 whitespace-nowrap font-medium text-slate-900">
                    {b.slot_date} · {fmtBkTime(b.slot_time)}
                  </td>
                  <td className="py-2 pr-4">{b.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{b.email}</td>
                  <td className="py-2 pr-4 text-slate-600">{b.phone}</td>
                  <td className="py-2 pr-4 text-slate-600 max-w-[180px] truncate">{b.current_university || "—"}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        b.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {b.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(b.booking_id)}
                        data-testid={`bk-cancel-${b.booking_id}`}
                        className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UCAppointmentToggleCard({ credentials }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/dashboard/uc-appointment-toggle`, {
          params: credentials,
        });
        if (!cancelled) {
          setEnabled(!!data?.enabled);
          setLocked(data?.locked !== false);
        }
      } catch (e) {
        if (!cancelled) toast.error("Failed to load appointment toggle");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [credentials]);

  const handleToggle = () => {
    if (locked) {
      toast.info("Appointment booking is permanently disabled from the backend.");
      return;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" data-testid="uc-appointment-toggle-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Ask visitors to pick an appointment slot?</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            When ON, the Berlin form shows the &ldquo;Mode of Consultation&rdquo; field and opens the booking
            calendar after submit. When OFF, the form only collects the lead&rsquo;s details — your team
            will follow up manually.
          </p>
          {locked && (
            <p className="text-[11px] mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800 font-medium">
              Locked OFF at backend — contact developer to re-enable
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={loading || locked}
          data-testid="uc-appointment-toggle-switch"
          className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
            locked ? "cursor-not-allowed opacity-70" : ""
          } ${enabled ? "bg-teal-600" : "bg-slate-300"}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <p className="mt-3 text-xs font-medium" style={{ color: enabled ? "#0f766e" : "#64748b" }}>
        Status: {loading ? "Loading…" : enabled ? "Appointment booking is ON" : "Only collecting lead details (appointment OFF)"}
      </p>
    </div>
  );
}

function BookingSettings({ credentials }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/dashboard/uc-bookings/settings`, {
        params: credentials,
      });
      setForm({
        working_days: data.working_days || [0, 1, 2, 3, 4, 5],
        start_time: data.start_time || "10:00",
        end_time: data.end_time || "19:00",
        slot_minutes: data.slot_minutes || 30,
        advance_days: data.advance_days || 30,
        min_lead_minutes: data.min_lead_minutes || 60,
        open_ranges: Array.isArray(data.open_ranges) ? data.open_ranges : [],
      });
    } catch (e) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleDay = (idx) => {
    setForm((p) => {
      const set = new Set(p.working_days);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      return { ...p, working_days: [...set].sort((a, b) => a - b) };
    });
  };

  const ensureRange = (i) => {
    const r = (form?.open_ranges || [])[i] || { start: "", end: "" };
    return r;
  };

  const updateRange = (i, key, value) => {
    setForm((p) => {
      const ranges = [...(p.open_ranges || [])];
      while (ranges.length <= i) ranges.push({ start: "", end: "" });
      ranges[i] = { ...ranges[i], [key]: value };
      return { ...p, open_ranges: ranges };
    });
  };

  const addSecondRange = () => {
    setForm((p) => {
      const ranges = [...(p.open_ranges || [])];
      if (ranges.length === 0) ranges.push({ start: "", end: "" });
      if (ranges.length === 1) ranges.push({ start: "", end: "" });
      return { ...p, open_ranges: ranges };
    });
  };

  const removeRange = (i) => {
    setForm((p) => {
      const ranges = [...(p.open_ranges || [])];
      ranges.splice(i, 1);
      return { ...p, open_ranges: ranges };
    });
  };

  const clearAllRanges = () => {
    setForm((p) => ({ ...p, open_ranges: [] }));
  };

  const handleSave = async () => {
    if (!form) return;
    // Strip empty ranges before sending
    const cleanRanges = (form.open_ranges || []).filter(
      (r) => r && r.start && r.end,
    );
    // Validate: each range start <= end, two ranges must have a gap
    for (const r of cleanRanges) {
      if (r.start > r.end) {
        toast.error("Each range's start date must be on or before its end date.");
        return;
      }
    }
    if (cleanRanges.length === 2) {
      const sorted = [...cleanRanges].sort((a, b) => a.start.localeCompare(b.start));
      if (sorted[1].start <= sorted[0].end) {
        toast.error("The two open ranges must not overlap. Leave a gap between them.");
        return;
      }
    }
    setSaving(true);
    try {
      await axios.post(
        `${API}/dashboard/uc-bookings/settings`,
        { ...form, open_ranges: cleanRanges },
        { params: credentials },
      );
      toast.success("Settings saved");
      await fetchSettings();
    } catch (e) {
      const detail = e?.response?.data?.detail || "Failed to save";
      toast.error(typeof detail === "string" ? detail : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <p className="text-sm text-slate-500">Loading…</p>;

  const ranges = form.open_ranges || [];
  const hasAnyRange = ranges.some((r) => r && r.start && r.end);

  return (
    <div className="max-w-2xl space-y-6">
      <UCAppointmentToggleCard credentials={credentials} />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Working days</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS_FULL.map((d, i) => {
            const on = form.working_days.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                data-testid={`bk-day-${i}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  on
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start time (Berlin / CET)</label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            data-testid="bk-start-time"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End time (Berlin / CET)</label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            data-testid="bk-end-time"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Slot length (minutes)</label>
          <input
            type="number"
            min={5}
            max={240}
            value={form.slot_minutes}
            onChange={(e) => setForm({ ...form, slot_minutes: parseInt(e.target.value || "0", 10) })}
            data-testid="bk-slot-minutes"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Fallback rolling window (days ahead)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={form.advance_days}
            onChange={(e) => setForm({ ...form, advance_days: parseInt(e.target.value || "0", 10) })}
            data-testid="bk-advance-days"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Used only when no explicit open date ranges are set below.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Minimum lead time (minutes before call)</label>
          <input
            type="number"
            min={0}
            max={1440}
            value={form.min_lead_minutes}
            onChange={(e) => setForm({ ...form, min_lead_minutes: parseInt(e.target.value || "0", 10) })}
            data-testid="bk-min-lead"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
          <p className="text-xs text-slate-500 mt-1">Students can&apos;t book a slot that starts within this many minutes.</p>
        </div>
      </div>

      {/* ===== Date-range openings ===== */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <label className="block text-sm font-semibold text-slate-800">
              Open bookings for specific date ranges
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Pick a calendar range (or two, with a gap) during which the booking
              calendar is open. Leave both empty to keep the rolling window above.
            </p>
          </div>
          {hasAnyRange && (
            <button
              type="button"
              onClick={clearAllRanges}
              data-testid="bk-ranges-clear"
              className="shrink-0 text-xs text-slate-500 hover:text-red-600 underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Range 1 */}
        <RangeRow
          label="Range 1"
          idx={0}
          value={ensureRange(0)}
          onChange={updateRange}
          onRemove={ranges.length > 0 ? () => removeRange(0) : null}
        />

        {/* Range 2 (optional) */}
        {ranges.length >= 2 ? (
          <RangeRow
            label="Range 2 (after a gap)"
            idx={1}
            value={ensureRange(1)}
            onChange={updateRange}
            onRemove={() => removeRange(1)}
          />
        ) : (
          ranges[0]?.start && ranges[0]?.end && (
            <button
              type="button"
              onClick={addSecondRange}
              data-testid="bk-ranges-add-second"
              className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-800 underline"
            >
              + Add a second range (with a gap)
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        data-testid="bk-save-settings"
        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-lg transition-colors"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

function RangeRow({ label, idx, value, onChange, onRemove }) {
  return (
    <div className="mt-3 first:mt-0 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {label} · start
        </label>
        <input
          type="date"
          value={value.start || ""}
          onChange={(e) => onChange(idx, "start", e.target.value)}
          data-testid={`bk-range-${idx}-start`}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {label} · end
        </label>
        <input
          type="date"
          value={value.end || ""}
          onChange={(e) => onChange(idx, "end", e.target.value)}
          data-testid={`bk-range-${idx}-end`}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          data-testid={`bk-range-${idx}-remove`}
          className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg"
        >
          Remove
        </button>
      )}
    </div>
  );
}


// ==================== IELTS Celebration WhatsApp Template Settings ====================

// ─── WhatsApp Hub (tabbed view) ───────────────────────────────────────────
function WhatsAppHub({ credentials }) {
  const [sub, setSub] = useState("campaigns");

  const TABS = [
    { key: "campaigns",   label: "Templates & Schedules",   desc: "Multi-touch sequences for Germany Fair etc." },
    { key: "ielts",       label: "IELTS Celebration",       desc: "Per-scenario templates for /ielts-celebration leads" },
    { key: "university",  label: "University Change",       desc: "Per-mode templates for /university-change leads" },
  ];

  return (
    <div className="space-y-6" data-testid="whatsapp-hub">
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 inline-flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            data-testid={`whatsapp-subtab-${t.key}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              sub === t.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "campaigns"  && <WhatsAppManager credentials={credentials} />}
      {sub === "ielts"      && <IeltsWhatsappSettingsManager credentials={credentials} />}
      {sub === "university" && <UcWhatsappSettingsManager credentials={credentials} />}
    </div>
  );
}

// ─── University Change WhatsApp settings ─────────────────────────────────
function UcWhatsappSettingsManager({ credentials }) {
  const [settings, setSettings] = useState({
    in_person_template: "",
    telephonic_template: "",
    online_template: "",
    provider: "",
    key_configured: false,
    account_label: "",
    updated_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const params = new URLSearchParams({
    email: credentials.email,
    password: credentials.password,
  }).toString();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/dashboard/uc-whatsapp-settings?${params}`);
      setSettings({
        in_person_template: res.data.in_person_template || "",
        telephonic_template: res.data.telephonic_template || "",
        online_template: res.data.online_template || "",
        provider: res.data.provider || "",
        key_configured: !!res.data.key_configured,
        account_label: res.data.account_label || "",
        updated_at: res.data.updated_at || null,
      });
    } catch {
      toast.error("Failed to load University Change WhatsApp settings");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleChange = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/dashboard/uc-whatsapp-settings?${params}`,
        {
          in_person_template: settings.in_person_template.trim(),
          telephonic_template: settings.telephonic_template.trim(),
          online_template: settings.online_template.trim(),
        },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success("University Change WhatsApp templates saved");
      fetchSettings();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const SCENARIOS = [
    {
      key: "in_person_template",
      title: "Mode · In‑person",
      desc: "Fired when consultation_mode = in_person. Body variable: name. Optional URL button → Berlin office Maps link.",
      pillColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      placeholder: "e.g. uc_welcome_in_person",
    },
    {
      key: "telephonic_template",
      title: "Mode · Telephonic",
      desc: "Fired when consultation_mode = telephonic. Body variable: name. Tells the student we'll call from +49 1784555932.",
      pillColor: "bg-blue-100 text-blue-700 border-blue-200",
      placeholder: "e.g. uc_welcome_telephonic",
    },
    {
      key: "online_template",
      title: "Mode · Online",
      desc: "Fired when consultation_mode = online. Body variable: name. Template must have a dynamic URL button: base 'https://meet.jit.si/' + {{1}} = VisaxpertBerlin-<lead_id>.",
      pillColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
      placeholder: "e.g. uc_welcome_online",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm" data-testid="uc-wa-settings-panel">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap size={20} className="text-emerald-600" />
            University Change · WhatsApp Templates
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Set the AiSensy campaign / template name for each consultation mode coming from the
            <span className="font-semibold"> /university-change </span>
            page. These are sent via a dedicated AiSensy sub-account so they're isolated from the rest of the site.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>
            Account:&nbsp;
            <span className={`font-semibold ${settings.key_configured ? 'text-emerald-700' : 'text-rose-600'}`}>
              {settings.account_label || (settings.key_configured ? "Configured" : "Not configured")}
            </span>
          </div>
          <div>Provider: <span className="font-semibold text-slate-700">{settings.provider || "—"}</span></div>
          {settings.updated_at && (
            <div className="mt-0.5">Last saved: {new Date(settings.updated_at).toLocaleString()}</div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-500" data-testid="uc-wa-loading">
          <RefreshCw size={18} className="animate-spin mr-2" /> Loading settings…
        </div>
      ) : (
        <>
          {!settings.key_configured && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800" data-testid="uc-wa-no-key">
              ⚠ <span className="font-semibold">AISENSY_API_KEY_UC</span> is not set in the backend .env. Saving template names will work, but no WhatsApp messages will be sent until the key is added.
            </div>
          )}

          <div className="grid gap-5">
            {SCENARIOS.map((s) => (
              <div key={s.key} className="border-2 border-slate-100 rounded-xl p-5 hover:border-slate-200 transition-colors" data-testid={`uc-wa-card-${s.key}`}>
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s.pillColor}`}>
                      {s.title}
                    </span>
                    <p className="text-sm text-slate-600 mt-2 max-w-xl">{s.desc}</p>
                  </div>
                </div>
                <label className="block text-xs font-bold text-slate-600 mt-3 mb-1.5 uppercase tracking-wider">
                  AiSensy Campaign / Template Name
                </label>
                <input
                  type="text"
                  value={settings[s.key]}
                  onChange={(e) => handleChange(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none text-sm font-mono transition-colors"
                  data-testid={`uc-wa-input-${s.key}`}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3" data-testid="uc-wa-note">
            <Settings size={16} className="text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Each template receives exactly <b>one body variable: the user&apos;s name</b>. The <b>online</b> template additionally
              receives one URL-button suffix variable carrying <code className="font-mono">VisaxpertBerlin-&lt;lead_id&gt;</code>,
              which gets appended to <code className="font-mono">https://meet.jit.si/</code> to form the student&apos;s personal Jitsi meeting URL.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="uc-wa-save-btn"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 disabled:opacity-60 text-white font-bold rounded-lg transition-all shadow-md shadow-emerald-500/30"
            >
              {saving ? "Saving…" : "Save templates"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function IeltsWhatsappSettingsManager({ credentials }) {
  const [settings, setSettings] = useState({
    to_book_template: "",
    pte_others_template: "",
    already_booked_template: "",
    fallback_template: "",
    provider: "",
    updated_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const params = new URLSearchParams({
    email: credentials.email,
    password: credentials.password,
  }).toString();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/dashboard/ielts-whatsapp-settings?${params}`);
      setSettings({
        to_book_template: res.data.to_book_template || "",
        pte_others_template: res.data.pte_others_template || "",
        already_booked_template: res.data.already_booked_template || "",
        fallback_template: res.data.fallback_template || "",
        provider: res.data.provider || "",
        updated_at: res.data.updated_at || null,
      });
    } catch (e) {
      toast.error("Failed to load IELTS WhatsApp settings");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/dashboard/ielts-whatsapp-settings?${params}`,
        {
          to_book_template: settings.to_book_template.trim(),
          pte_others_template: settings.pte_others_template.trim(),
          already_booked_template: settings.already_booked_template.trim(),
        },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success("IELTS WhatsApp templates saved");
      fetchSettings();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const SCENARIOS = [
    {
      key: "to_book_template",
      title: "Scenario 1 · Exam to be Booked",
      desc: "When the student picks IELTS and has NOT yet booked (Within 2 weeks / 1-2 months / 3+ months).",
      pillColor: "bg-amber-100 text-amber-700 border-amber-200",
      placeholder: "e.g. ielts_book_offer",
    },
    {
      key: "pte_others_template",
      title: "Scenario 2 · PTE or Other English Test",
      desc: "When the student picks PTE or Others as their English test.",
      pillColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      placeholder: "e.g. ielts_pte_offer",
    },
    {
      key: "already_booked_template",
      title: "Scenario 3 · Already Booked",
      desc: "When the student picks IELTS and selects \"Already Booked\" in the timeframe.",
      pillColor: "bg-rose-100 text-rose-700 border-rose-200",
      placeholder: "e.g. ielts_hamper_pickup",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm" data-testid="ielts-wa-settings-panel">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Send size={20} className="text-rose-500" />
            IELTS Celebration · WhatsApp Templates
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Set the AiSensy campaign / WhatsApp template name to fire for each lead scenario coming from the
            <span className="font-semibold"> /ielts-celebration </span>
            page. Each template receives exactly <b>one body variable: the user&apos;s name</b>.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Provider: <span className="font-semibold text-slate-700">{settings.provider || "—"}</span></div>
          {settings.updated_at && (
            <div className="mt-0.5">Last saved: {new Date(settings.updated_at).toLocaleString()}</div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-500" data-testid="ielts-wa-loading">
          <RefreshCw size={18} className="animate-spin mr-2" /> Loading settings…
        </div>
      ) : (
        <>
          <div className="grid gap-5">
            {SCENARIOS.map((s) => (
              <div key={s.key} className="border-2 border-slate-100 rounded-xl p-5 hover:border-slate-200 transition-colors" data-testid={`ielts-wa-card-${s.key}`}>
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s.pillColor}`}>
                      {s.title}
                    </span>
                    <p className="text-sm text-slate-600 mt-2 max-w-xl">{s.desc}</p>
                  </div>
                </div>
                <label className="block text-xs font-bold text-slate-600 mt-3 mb-1.5 uppercase tracking-wider">
                  AiSensy Campaign / Template Name
                </label>
                <input
                  type="text"
                  value={settings[s.key]}
                  onChange={(e) => handleChange(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none text-sm font-mono transition-colors"
                  data-testid={`ielts-wa-input-${s.key}`}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3" data-testid="ielts-wa-fallback-note">
            <Settings size={16} className="text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              If you leave any field blank, that scenario will fall back to the global default template{" "}
              <span className="font-mono font-semibold text-slate-800">{settings.fallback_template || "—"}</span>{" "}
              (configured via the <code className="font-mono">WHATSAPP_TEMPLATE_NAME</code> env var on the backend).
              The body variable sent to every template is just the user&apos;s name (1 variable).
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="ielts-wa-save-btn"
              className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:brightness-110 disabled:opacity-60 text-white font-bold rounded-lg transition-all shadow-md shadow-rose-500/30"
            >
              {saving ? "Saving…" : "Save templates"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
