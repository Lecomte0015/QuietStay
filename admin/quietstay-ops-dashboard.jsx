import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, Building2, CalendarDays, SprayCan, Users, FileText,
  Settings, LogOut, Plus, Search, Filter, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Eye, EyeOff, Key, Lock,
  Smartphone, Hash, Camera, X, Menu, Bell, Sun, Moon,
  ArrowUpRight, ArrowDownRight, TrendingUp, MapPin, Phone, Mail,
  MoreHorizontal, Edit, Trash2, Check, XCircle, Image,
  DollarSign, Percent, BarChart3, BedDouble, UserCheck, Plane
} from "lucide-react";

// ─── MOCK DATA ───────────────────────────────────────────────
const OWNERS = [
  { id: "o1", name: "Jean-Pierre Muller", email: "jp.muller@example.ch", phone: "+41 79 123 45 67", company: "Muller Immobilier SA", iban: "CH93 0076 2011 6238 5295 7", properties_count: 2, total_revenue: 6150 },
  { id: "o2", name: "Marie Favre", email: "marie.favre@example.ch", phone: "+41 78 234 56 78", company: null, iban: "CH56 0483 5012 3456 7800 9", properties_count: 2, total_revenue: 5120 },
  { id: "o3", name: "Luca Bernasconi", email: "luca.b@example.ch", phone: "+41 76 345 67 89", company: "LB Properties", iban: "CH21 0900 0000 1234 5678 9", properties_count: 2, total_revenue: 2340 },
];

const PROPERTIES = [
  { id: "p1", owner_id: "o1", name: "Studio Pâquis", address: "Rue de Berne 12", city: "Genève", canton: "GE", property_type: "studio", bedrooms: 0, max_guests: 2, status: "active" },
  { id: "p2", owner_id: "o1", name: "Appart Eaux-Vives", address: "Rue du Lac 45", city: "Genève", canton: "GE", property_type: "apartment", bedrooms: 2, max_guests: 4, status: "active" },
  { id: "p3", owner_id: "o2", name: "Chalet Verbier", address: "Route de Verbier 8", city: "Verbier", canton: "VS", property_type: "chalet", bedrooms: 3, max_guests: 6, status: "active" },
  { id: "p4", owner_id: "o2", name: "Studio Montreux", address: "Grand-Rue 22", city: "Montreux", canton: "VD", property_type: "studio", bedrooms: 0, max_guests: 2, status: "active" },
  { id: "p5", owner_id: "o3", name: "Villa Lugano", address: "Via Nassa 15", city: "Lugano", canton: "TI", property_type: "villa", bedrooms: 4, max_guests: 8, status: "maintenance" },
  { id: "p6", owner_id: "o3", name: "Appart Lausanne", address: "Av. de la Gare 10", city: "Lausanne", canton: "VD", property_type: "apartment", bedrooms: 1, max_guests: 3, status: "active" },
];

const today = new Date().toISOString().split("T")[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().split("T")[0]; };

const BOOKINGS = [
  { id: "b1", property_id: "p1", platform: "airbnb", check_in: addDays(today, -3), check_out: today, guest_name: "Anna Schmidt", guest_phone: "+49 170 1234567", guest_count: 2, total_amount: 450, commission_rate: 20, status: "checked_in" },
  { id: "b2", property_id: "p2", platform: "booking", check_in: today, check_out: addDays(today, 4), guest_name: "Thomas Dupont", guest_phone: "+33 6 12345678", guest_count: 3, total_amount: 880, commission_rate: 18, status: "confirmed" },
  { id: "b3", property_id: "p3", platform: "direct", check_in: addDays(today, 1), check_out: addDays(today, 7), guest_name: "James Wilson", guest_phone: "+44 7911 123456", guest_count: 5, total_amount: 2100, commission_rate: 20, status: "confirmed" },
  { id: "b4", property_id: "p4", platform: "airbnb", check_in: addDays(today, -1), check_out: addDays(today, 2), guest_name: "Sophie Martin", guest_phone: "+41 79 987 65 43", guest_count: 1, total_amount: 320, commission_rate: 20, status: "checked_in" },
  { id: "b5", property_id: "p1", platform: "booking", check_in: addDays(today, 1), check_out: addDays(today, 5), guest_name: "Marco Rossi", guest_phone: "+39 333 1234567", guest_count: 2, total_amount: 600, commission_rate: 18, status: "confirmed" },
  { id: "b6", property_id: "p6", platform: "airbnb", check_in: addDays(today, 2), check_out: addDays(today, 5), guest_name: "Elena Petrova", guest_phone: "+7 916 1234567", guest_count: 2, total_amount: 540, commission_rate: 20, status: "pending" },
  { id: "b7", property_id: "p2", platform: "direct", check_in: addDays(today, -7), check_out: addDays(today, -2), guest_name: "Hans Weber", guest_phone: "+49 171 9876543", guest_count: 4, total_amount: 1100, commission_rate: 20, status: "checked_out" },
  { id: "b8", property_id: "p3", platform: "booking", check_in: addDays(today, -10), check_out: addDays(today, -3), guest_name: "Claire Blanc", guest_phone: "+33 6 98765432", guest_count: 6, total_amount: 2800, commission_rate: 18, status: "checked_out" },
];

const CLEANINGS = [
  { id: "cl1", booking_id: "b1", property_id: "p1", scheduled_date: today, status: "pending", type: "checkout", notes: "Vérifier draps et serviettes", photos: [], assignee: "Maria Lopez" },
  { id: "cl2", booking_id: "b2", property_id: "p2", scheduled_date: today, status: "in_progress", type: "checkin", notes: "Préparer kit bienvenue", photos: [], assignee: "Pierre Blanc" },
  { id: "cl3", booking_id: "b4", property_id: "p4", scheduled_date: addDays(today, 2), status: "pending", type: "checkout", notes: null, photos: [], assignee: null },
  { id: "cl4", booking_id: "b7", property_id: "p2", scheduled_date: addDays(today, -2), status: "validated", type: "checkout", notes: "Ménage complet effectué", photos: ["photo1.jpg", "photo2.jpg"], assignee: "Maria Lopez" },
  { id: "cl5", booking_id: "b8", property_id: "p3", scheduled_date: addDays(today, -3), status: "done", type: "checkout", notes: "Photos à valider", photos: ["photo3.jpg"], assignee: "Pierre Blanc" },
];

const ACCESSES = [
  { id: "a1", property_id: "p1", type: "code", label: "Porte immeuble", value: "4589#", instructions: "Taper le code puis appuyer sur la clé" },
  { id: "a2", property_id: "p1", type: "lockbox", label: "Boîte à clés", value: "7723", instructions: "Boîtier noir à droite de la porte" },
  { id: "a3", property_id: "p2", type: "smartlock", label: "Serrure connectée", value: "Temporaire", instructions: "Code envoyé 24h avant" },
  { id: "a4", property_id: "p3", type: "key", label: "Clé physique", value: "Trousseau #12", instructions: "Réception hôtel" },
  { id: "a5", property_id: "p4", type: "code", label: "Entrée", value: "1234#", instructions: null },
  { id: "a6", property_id: "p6", type: "lockbox", label: "Boîte à clés", value: "9901", instructions: "Côté gauche du hall" },
];

const INVOICES = [
  { id: "i1", owner_id: "o1", period_start: "2025-12-01", period_end: "2025-12-31", total_revenue: 3200, commission_amount: 640, cleaning_costs: 240, other_costs: 0, net_amount: 2320, status: "paid" },
  { id: "i2", owner_id: "o2", period_start: "2025-12-01", period_end: "2025-12-31", total_revenue: 4800, commission_amount: 960, cleaning_costs: 360, other_costs: 0, net_amount: 3480, status: "sent" },
  { id: "i3", owner_id: "o3", period_start: "2025-12-01", period_end: "2025-12-31", total_revenue: 1800, commission_amount: 360, cleaning_costs: 180, other_costs: 0, net_amount: 1260, status: "draft" },
  { id: "i4", owner_id: "o1", period_start: "2026-01-01", period_end: "2026-01-31", total_revenue: 2950, commission_amount: 590, cleaning_costs: 200, other_costs: 0, net_amount: 2160, status: "draft" },
];

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString("fr-CH");
const nights = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 864e5);
const getProp = (id) => PROPERTIES.find(p => p.id === id);
const getOwner = (id) => OWNERS.find(o => o.id === id);

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-emerald-100 text-emerald-800", checked_out: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-800", in_progress: "bg-sky-100 text-sky-800",
  done: "bg-teal-100 text-teal-800", validated: "bg-emerald-100 text-emerald-800",
  issue: "bg-red-100 text-red-800", draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-800", paid: "bg-emerald-100 text-emerald-800",
  active: "bg-emerald-100 text-emerald-800", inactive: "bg-slate-100 text-slate-600",
  maintenance: "bg-amber-100 text-amber-800",
};

const STATUS_FR = {
  pending: "En attente", confirmed: "Confirmée", checked_in: "En cours",
  checked_out: "Terminée", cancelled: "Annulée", in_progress: "En cours",
  done: "Terminé", validated: "Validé", issue: "Problème",
  draft: "Brouillon", sent: "Envoyée", paid: "Payée",
  active: "Actif", inactive: "Inactif", maintenance: "Maintenance",
};

const PLATFORM_COLORS = {
  airbnb: "bg-rose-500", booking: "bg-blue-600", direct: "bg-violet-600", other: "bg-slate-500"
};

const PROPERTY_ICONS = {
  apartment: "🏢", house: "🏠", studio: "🏙️", chalet: "🏔️", villa: "🏛️"
};

const ACCESS_ICONS = { code: Hash, key: Key, lockbox: Lock, smartlock: Smartphone };

const Badge = ({ status, className = "" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"} ${className}`}>
    {STATUS_FR[status] || status}
  </span>
);

// ─── MAIN APP ────────────────────────────────────────────────
export default function QuietStayOps() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user] = useState({ name: "Admin QuietStay", role: "admin", email: "admin@quietstay.ch" });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const NAV = [
    { id: "dashboard", label: "Tableau de bord", icon: Home },
    { id: "properties", label: "Logements", icon: Building2 },
    { id: "bookings", label: "Réservations", icon: CalendarDays },
    { id: "cleanings", label: "Ménages", icon: SprayCan },
    { id: "owners", label: "Propriétaires", icon: Users },
    { id: "invoices", label: "Facturation", icon: FileText },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage />;
      case "properties": return <PropertiesPage />;
      case "bookings": return <BookingsPage />;
      case "cleanings": return <CleaningsPage />;
      case "owners": return <OwnersPage />;
      case "invoices": return <InvoicesPage />;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Instrument Sans', system-ui, -apple-system, sans-serif" }}
      className="flex h-screen bg-stone-50 text-stone-800 overflow-hidden">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} transition-all duration-300 bg-stone-900 text-stone-200 flex flex-col shrink-0 ${showMobileMenu ? "fixed inset-y-0 left-0 z-50" : "hidden md:flex"}`}>
        {/* Logo */}
        <div className={`h-16 flex items-center ${sidebarOpen ? "px-6" : "px-4 justify-center"} border-b border-stone-700/50`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-white text-sm font-bold">QS</span>
              </div>
              <div>
                <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-base font-normal text-white tracking-tight">QuietStay</h1>
                <p className="text-[10px] text-stone-400 tracking-widest uppercase">Ops</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">QS</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setPage(id); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all
                ${page === id
                  ? "bg-amber-500/15 text-amber-400 font-medium"
                  : "text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                } ${!sidebarOpen && "justify-center"}`}>
              <Icon size={18} strokeWidth={page === id ? 2 : 1.5} />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className={`p-4 border-t border-stone-700/50 ${sidebarOpen ? "" : "flex justify-center"}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center text-xs font-medium text-white">
                {user.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-stone-500 capitalize">{user.role}</p>
              </div>
              <button className="text-stone-500 hover:text-stone-300" title="Déconnexion">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white">AD</div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center px-4 md:px-8 gap-4 shrink-0">
          <button className="md:hidden text-stone-500" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            <Menu size={22} />
          </button>
          <button className="hidden md:block text-stone-400 hover:text-stone-600"
            onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={20} />
          </button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher logement, réservation, propriétaire..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-100 border-0 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-stone-100 text-stone-500">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>

      {/* Mobile overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
      )}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────
function DashboardPage() {
  const todayArrivals = BOOKINGS.filter(b => b.check_in === today && b.status !== "cancelled");
  const todayDepartures = BOOKINGS.filter(b => b.check_out === today && b.status !== "cancelled");
  const activeBookings = BOOKINGS.filter(b => ["confirmed", "checked_in"].includes(b.status));
  const pendingCleanings = CLEANINGS.filter(c => ["pending", "in_progress"].includes(c.status));
  const monthRevenue = BOOKINGS.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.total_amount || 0), 0);
  const activeProps = PROPERTIES.filter(p => p.status === "active").length;

  const KPIs = [
    { label: "Logements actifs", value: activeProps, icon: Building2, color: "from-blue-500 to-indigo-600", change: null },
    { label: "Réservations actives", value: activeBookings.length, icon: CalendarDays, color: "from-emerald-500 to-teal-600", change: "+12%" },
    { label: "Ménages à faire", value: pendingCleanings.length, icon: SprayCan, color: "from-amber-500 to-orange-600", change: null },
    { label: "Revenu du mois", value: fmt(monthRevenue), icon: TrendingUp, color: "from-violet-500 to-purple-600", change: "+8%" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-stone-900">Tableau de bord</h2>
        <p className="text-sm text-stone-500 mt-1">Vue d'ensemble de votre conciergerie</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIs.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-stone-200 hover:shadow-lg hover:shadow-stone-200/50 transition-all group">
            <div className="flex justify-between items-start">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg shadow-stone-300/20 group-hover:scale-110 transition-transform`}>
                <kpi.icon size={18} className="text-white" />
              </div>
              {kpi.change && (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight size={12} />{kpi.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-semibold text-stone-900">{kpi.value}</p>
              <p className="text-xs text-stone-500 mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Arrivées / Départs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MovementsCard title="Arrivées aujourd'hui" icon={Plane} items={todayArrivals} type="arrival" />
        <MovementsCard title="Départs aujourd'hui" icon={ArrowUpRight} items={todayDepartures} type="departure" />
      </div>

      {/* Ménages du jour + Réservations récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ménages */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
            <h3 className="font-semibold text-stone-900">Ménages à traiter</h3>
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">{pendingCleanings.length} en attente</span>
          </div>
          <div className="divide-y divide-stone-100">
            {CLEANINGS.filter(c => c.scheduled_date >= addDays(today, -1) && c.status !== "validated").slice(0, 5).map(c => {
              const prop = getProp(c.property_id);
              return (
                <div key={c.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                  <div className="text-xl">{PROPERTY_ICONS[prop?.property_type] || "🏠"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{prop?.name}</p>
                    <p className="text-xs text-stone-500">{fmtDate(c.scheduled_date)} · {c.type === "checkout" ? "Départ" : "Arrivée"}</p>
                  </div>
                  <Badge status={c.status} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900">Répartition par plateforme</h3>
          </div>
          <div className="p-6 space-y-4">
            {["airbnb", "booking", "direct"].map(p => {
              const count = BOOKINGS.filter(b => b.platform === p && b.status !== "cancelled").length;
              const total = BOOKINGS.filter(b => b.status !== "cancelled").length;
              const pct = Math.round((count / total) * 100);
              const rev = BOOKINGS.filter(b => b.platform === p && b.status !== "cancelled").reduce((s, b) => s + (b.total_amount || 0), 0);
              return (
                <div key={p}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${PLATFORM_COLORS[p]}`} />
                      <span className="text-sm font-medium text-stone-700 capitalize">{p === "booking" ? "Booking.com" : p === "direct" ? "Direct" : "Airbnb"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-stone-900">{count} rés.</span>
                      <span className="text-xs text-stone-500 ml-2">{fmt(rev)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${PLATFORM_COLORS[p]} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MovementsCard({ title, icon: Icon, items, type }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon size={16} className={type === "arrival" ? "text-emerald-500" : "text-blue-500"} />
          <h3 className="font-semibold text-stone-900">{title}</h3>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${type === "arrival" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-stone-400">Aucun mouvement aujourd'hui</div>
      ) : (
        <div className="divide-y divide-stone-100">
          {items.map(b => {
            const prop = getProp(b.property_id);
            const access = ACCESSES.find(a => a.property_id === b.property_id);
            return (
              <div key={b.id} className="px-6 py-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{b.guest_name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{prop?.name} · {b.guest_count} pers. · {nights(b.check_in, b.check_out)} nuits</p>
                  </div>
                  <Badge status={b.status} />
                </div>
                {access && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-1.5">
                    {(() => { const I = ACCESS_ICONS[access.type]; return <I size={12} />; })()}
                    <span className="font-medium">{access.label}:</span>
                    <span className="font-mono">{access.value}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PROPERTIES ──────────────────────────────────────────────
function PropertiesPage() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = filter === "all" ? PROPERTIES : PROPERTIES.filter(p => p.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-stone-900">Logements</h2>
          <p className="text-sm text-stone-500 mt-1">{PROPERTIES.length} logements gérés</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Ajouter un logement
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[{ v: "all", l: "Tous" }, { v: "active", l: "Actifs" }, { v: "maintenance", l: "Maintenance" }, { v: "inactive", l: "Inactifs" }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.v ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const owner = getOwner(p.owner_id);
          const bookings = BOOKINGS.filter(b => b.property_id === p.id && b.status !== "cancelled");
          const access = ACCESSES.filter(a => a.property_id === p.id);
          return (
            <div key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:shadow-stone-200/50 transition-all cursor-pointer group">
              {/* Header with gradient */}
              <div className={`h-28 bg-gradient-to-br ${p.status === "active" ? "from-stone-800 to-stone-900" : p.status === "maintenance" ? "from-amber-700 to-amber-900" : "from-stone-500 to-stone-600"} relative flex items-end p-5`}>
                <div className="absolute top-4 right-4">
                  <Badge status={p.status} className="!bg-white/20 !text-white backdrop-blur-sm" />
                </div>
                <div>
                  <span className="text-2xl">{PROPERTY_ICONS[p.property_type]}</span>
                  <h3 className="text-white font-semibold text-lg mt-1">{p.name}</h3>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <MapPin size={14} className="text-stone-400" />
                  <span>{p.address}, {p.city} ({p.canton})</span>
                </div>

                <div className="flex gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><BedDouble size={13} /> {p.bedrooms === 0 ? "Studio" : `${p.bedrooms} ch.`}</span>
                  <span className="flex items-center gap-1"><Users size={13} /> {p.max_guests} pers.</span>
                  <span className="flex items-center gap-1"><CalendarDays size={13} /> {bookings.length} rés.</span>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-xs text-stone-500">
                    <span className="font-medium text-stone-700">{owner?.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {access.map(a => {
                      const I = ACCESS_ICONS[a.type];
                      return <div key={a.id} className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center" title={`${a.label}: ${a.value}`}><I size={12} className="text-stone-500" /></div>;
                    })}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {selected === p.id && (
                <div className="border-t border-stone-100 px-5 py-4 bg-stone-50 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Accès</h4>
                  {access.map(a => (
                    <div key={a.id} className="flex items-center gap-3 text-sm">
                      {(() => { const I = ACCESS_ICONS[a.type]; return <I size={14} className="text-stone-500" />; })()}
                      <span className="font-medium">{a.label}:</span>
                      <code className="px-2 py-0.5 rounded bg-stone-200 text-xs font-mono">{a.value}</code>
                      {a.instructions && <span className="text-xs text-stone-400">— {a.instructions}</span>}
                    </div>
                  ))}
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 pt-2">Réservations récentes</h4>
                  {bookings.slice(0, 3).map(b => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span>{b.guest_name}</span>
                      <span className="text-xs text-stone-500">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</span>
                      <Badge status={b.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BOOKINGS ────────────────────────────────────────────────
function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filtered = BOOKINGS.filter(b =>
    (statusFilter === "all" || b.status === statusFilter) &&
    (platformFilter === "all" || b.platform === platformFilter)
  ).sort((a, b) => new Date(b.check_in) - new Date(a.check_in));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-stone-900">Réservations</h2>
          <p className="text-sm text-stone-500 mt-1">{BOOKINGS.length} réservations totales</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Nouvelle réservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[{ v: "all", l: "Toutes" }, { v: "pending", l: "En attente" }, { v: "confirmed", l: "Confirmées" }, { v: "checked_in", l: "En cours" }, { v: "checked_out", l: "Terminées" }].map(f => (
          <button key={f.v} onClick={() => setStatusFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.v ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>
            {f.l}
          </button>
        ))}
        <div className="w-px bg-stone-200 mx-1" />
        {[{ v: "all", l: "Toutes plateformes" }, { v: "airbnb", l: "Airbnb" }, { v: "booking", l: "Booking" }, { v: "direct", l: "Direct" }].map(f => (
          <button key={f.v} onClick={() => setPlatformFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${platformFilter === f.v ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                {["Logement", "Voyageur", "Plateforme", "Arrivée", "Départ", "Nuits", "Montant", "Statut"].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(b => {
                const prop = getProp(b.property_id);
                return (
                  <tr key={b.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{PROPERTY_ICONS[prop?.property_type]}</span>
                        <span className="text-sm font-medium text-stone-900">{prop?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-stone-900">{b.guest_name}</p>
                      <p className="text-xs text-stone-500">{b.guest_count} pers.</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-white px-2.5 py-1 rounded-full ${PLATFORM_COLORS[b.platform]}`}>
                        {b.platform === "booking" ? "Booking" : b.platform === "direct" ? "Direct" : "Airbnb"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-stone-600">{fmtDate(b.check_in)}</td>
                    <td className="px-5 py-3.5 text-sm text-stone-600">{fmtDate(b.check_out)}</td>
                    <td className="px-5 py-3.5 text-sm text-stone-600 text-center">{nights(b.check_in, b.check_out)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-stone-900">{fmt(b.total_amount)}</td>
                    <td className="px-5 py-3.5"><Badge status={b.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline visuelle */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-semibold text-stone-900 mb-4">Timeline des 14 prochains jours</h3>
        <div className="space-y-3">
          {PROPERTIES.filter(p => p.status === "active").map(prop => {
            const propBookings = BOOKINGS.filter(b => b.property_id === prop.id && b.status !== "cancelled");
            return (
              <div key={prop.id} className="flex items-center gap-4">
                <div className="w-36 text-sm font-medium text-stone-700 truncate shrink-0">{prop.name}</div>
                <div className="flex-1 h-8 bg-stone-100 rounded-lg relative overflow-hidden">
                  {propBookings.map(b => {
                    const start = Math.max(0, (new Date(b.check_in) - new Date(today)) / 864e5);
                    const dur = nights(b.check_in, b.check_out);
                    const left = Math.max(0, (start / 14) * 100);
                    const width = Math.min(100 - left, (dur / 14) * 100);
                    if (left > 100 || width <= 0) return null;
                    return (
                      <div key={b.id}
                        className={`absolute top-1 bottom-1 rounded-md ${PLATFORM_COLORS[b.platform]} opacity-80 flex items-center px-2`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                        title={`${b.guest_name}: ${fmtDate(b.check_in)} → ${fmtDate(b.check_out)}`}>
                        <span className="text-white text-[10px] font-medium truncate">{b.guest_name.split(" ")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 mt-2">
            <div className="w-36" />
            <div className="flex-1 flex justify-between text-[10px] text-stone-400 px-1">
              {Array.from({ length: 15 }, (_, i) => {
                const d = new Date(today);
                d.setDate(d.getDate() + i);
                return <span key={i}>{d.getDate()}/{d.getMonth() + 1}</span>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CLEANINGS ───────────────────────────────────────────────
function CleaningsPage() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const defaultChecklist = [
    "Aspirateur / balai", "Nettoyage sols", "Salle de bain", "Cuisine",
    "Changement draps", "Serviettes propres", "Poubelles vidées",
    "Produits accueil", "Vérification équipements", "Photos prises"
  ];

  const filtered = CLEANINGS.filter(c => filter === "all" || c.status === filter)
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-stone-900">Ménages</h2>
          <p className="text-sm text-stone-500 mt-1">Gestion du nettoyage et de la validation</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ v: "all", l: "Tous" }, { v: "pending", l: "À faire" }, { v: "in_progress", l: "En cours" }, { v: "done", l: "Terminés" }, { v: "validated", l: "Validés" }, { v: "issue", l: "Problèmes" }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.v ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(c => {
          const prop = getProp(c.property_id);
          const booking = BOOKINGS.find(b => b.id === c.booking_id);
          const expanded = expandedId === c.id;
          const isToday = c.scheduled_date === today;

          return (
            <div key={c.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${isToday ? "border-amber-300 shadow-md shadow-amber-100/50" : "border-stone-200"}`}>
              <div className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : c.id)}>
                <div className="text-xl">{PROPERTY_ICONS[prop?.property_type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-stone-900">{prop?.name}</p>
                    {isToday && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">Aujourd'hui</span>}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {fmtDate(c.scheduled_date)} · {c.type === "checkout" ? "Ménage départ" : c.type === "checkin" ? "Préparation arrivée" : c.type === "deep" ? "Ménage approfondi" : "Maintenance"}
                    {booking && ` · ${booking.guest_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.assignee ? (
                    <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">{c.assignee}</span>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Non assigné</span>
                  )}
                  <Badge status={c.status} />
                  <ChevronDown size={16} className={`text-stone-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </div>
              </div>

              {expanded && (
                <div className="border-t border-stone-100 px-6 py-5 bg-stone-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Checklist */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Checklist</h4>
                      <div className="space-y-2">
                        {defaultChecklist.map((item, i) => (
                          <label key={i} className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer hover:text-stone-900">
                            <input type="checkbox" defaultChecked={c.status === "validated" || (c.status === "done" && i < 8)}
                              className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400" />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Photos + Notes */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Photos</h4>
                        {c.photos.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {c.photos.map((p, i) => (
                              <div key={i} className="w-20 h-20 rounded-xl bg-stone-200 flex items-center justify-center text-stone-400">
                                <Image size={20} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center">
                            <Camera size={24} className="mx-auto text-stone-400 mb-2" />
                            <p className="text-xs text-stone-500">Photos obligatoires avant validation</p>
                            <button className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-700">Ajouter des photos</button>
                          </div>
                        )}
                      </div>

                      {c.notes && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Notes</h4>
                          <p className="text-sm text-stone-600 bg-white rounded-lg p-3 border border-stone-200">{c.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {c.status === "pending" && (
                          <button className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors">
                            Démarrer le ménage
                          </button>
                        )}
                        {c.status === "in_progress" && (
                          <button className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors">
                            Marquer comme terminé
                          </button>
                        )}
                        {c.status === "done" && (
                          <button className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                            disabled={c.photos.length === 0}>
                            {c.photos.length === 0 ? "Photos requises pour valider" : "Valider le ménage"}
                          </button>
                        )}
                        {c.status !== "validated" && (
                          <button className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors">
                            Signaler un problème
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── OWNERS ──────────────────────────────────────────────────
function OwnersPage() {
  const [selectedOwner, setSelectedOwner] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-stone-900">Propriétaires</h2>
          <p className="text-sm text-stone-500 mt-1">{OWNERS.length} propriétaires partenaires</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Ajouter un propriétaire
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {OWNERS.map(o => {
          const props = PROPERTIES.filter(p => p.owner_id === o.id);
          const invs = INVOICES.filter(i => i.owner_id === o.id);
          const selected = selectedOwner === o.id;

          return (
            <div key={o.id} onClick={() => setSelectedOwner(selected ? null : o.id)}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:shadow-stone-200/50 transition-all cursor-pointer">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {o.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-900">{o.name}</h3>
                    {o.company && <p className="text-xs text-stone-500">{o.company}</p>}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Mail size={14} className="text-stone-400 shrink-0" />
                    <span className="truncate">{o.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Phone size={14} className="text-stone-400 shrink-0" />
                    <span>{o.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-lg font-semibold text-stone-900">{props.length}</p>
                    <p className="text-xs text-stone-500">Logements</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900">{fmt(o.total_revenue)}</p>
                    <p className="text-xs text-stone-500">Revenu total</p>
                  </div>
                </div>
              </div>

              {selected && (
                <div className="border-t border-stone-100 bg-stone-50 p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Logements</h4>
                    {props.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span>{PROPERTY_ICONS[p.property_type]}</span>
                          <span className="text-sm font-medium">{p.name}</span>
                        </div>
                        <Badge status={p.status} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Dernières factures</h4>
                    {invs.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-2">
                        <span className="text-sm">{fmtDate(inv.period_start)} → {fmtDate(inv.period_end)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{fmt(inv.net_amount)}</span>
                          <Badge status={inv.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {o.iban && (
                    <div className="text-xs text-stone-500">
                      IBAN: <code className="px-1.5 py-0.5 rounded bg-stone-200 font-mono text-stone-700">{o.iban}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── INVOICES ────────────────────────────────────────────────
function InvoicesPage() {
  const [filter, setFilter] = useState("all");

  const filtered = INVOICES.filter(i => filter === "all" || i.status === filter)
    .sort((a, b) => new Date(b.period_start) - new Date(a.period_start));

  const totalDraft = INVOICES.filter(i => i.status === "draft").reduce((s, i) => s + i.net_amount, 0);
  const totalSent = INVOICES.filter(i => i.status === "sent").reduce((s, i) => s + i.net_amount, 0);
  const totalPaid = INVOICES.filter(i => i.status === "paid").reduce((s, i) => s + i.net_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-stone-900">Facturation</h2>
          <p className="text-sm text-stone-500 mt-1">Factures propriétaires</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Générer les factures du mois
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Brouillons", value: fmt(totalDraft), count: INVOICES.filter(i => i.status === "draft").length, color: "text-stone-600", bg: "bg-stone-100" },
          { label: "Envoyées", value: fmt(totalSent), count: INVOICES.filter(i => i.status === "sent").length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Payées", value: fmt(totalPaid), count: INVOICES.filter(i => i.status === "paid").length, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl p-5 ${s.bg} border border-stone-200`}>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-stone-500 mt-1">{s.count} {s.label.toLowerCase()}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[{ v: "all", l: "Toutes" }, { v: "draft", l: "Brouillons" }, { v: "sent", l: "Envoyées" }, { v: "paid", l: "Payées" }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.v ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              {["Propriétaire", "Période", "Revenu brut", "Commission", "Frais ménage", "Net propriétaire", "Statut", ""].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filtered.map(inv => {
              const owner = getOwner(inv.owner_id);
              return (
                <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-stone-900">{owner?.name}</p>
                    {owner?.company && <p className="text-xs text-stone-500">{owner.company}</p>}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">{fmtDate(inv.period_start)} → {fmtDate(inv.period_end)}</td>
                  <td className="px-5 py-4 text-sm text-stone-900">{fmt(inv.total_revenue)}</td>
                  <td className="px-5 py-4 text-sm text-red-600">-{fmt(inv.commission_amount)}</td>
                  <td className="px-5 py-4 text-sm text-red-600">-{fmt(inv.cleaning_costs)}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-stone-900">{fmt(inv.net_amount)}</td>
                  <td className="px-5 py-4"><Badge status={inv.status} /></td>
                  <td className="px-5 py-4">
                    <button className="text-stone-400 hover:text-stone-600"><MoreHorizontal size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────
function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-stone-900">Paramètres</h2>
        <p className="text-sm text-stone-500 mt-1">Configuration de votre conciergerie</p>
      </div>

      {/* Company settings */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Informations entreprise</h3>
        </div>
        <div className="p-6 space-y-5">
          {[
            { label: "Nom de l'entreprise", value: "QuietStay Sàrl", type: "text" },
            { label: "Email de contact", value: "contact@quietstay.ch", type: "email" },
            { label: "Téléphone", value: "+41 22 123 45 67", type: "tel" },
            { label: "Adresse", value: "Rue du Rhône 42, 1204 Genève", type: "text" },
            { label: "Numéro IDE", value: "CHE-123.456.789", type: "text" },
          ].map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-stone-700">{f.label}</label>
              <input type={f.type} defaultValue={f.value}
                className="col-span-2 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Commission */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Commissions & tarifs</h3>
        </div>
        <div className="p-6 space-y-5">
          {[
            { label: "Commission par défaut (%)", value: "20", suffix: "%" },
            { label: "Tarif ménage standard (CHF)", value: "80", suffix: "CHF" },
            { label: "Tarif ménage approfondi (CHF)", value: "150", suffix: "CHF" },
          ].map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-stone-700">{f.label}</label>
              <div className="col-span-2 relative">
                <input type="number" defaultValue={f.value}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h3 className="font-semibold text-stone-900">Équipe</h3>
          <button className="text-sm text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1">
            <Plus size={14} /> Inviter
          </button>
        </div>
        <div className="divide-y divide-stone-100">
          {[
            { name: "Admin QuietStay", email: "admin@quietstay.ch", role: "admin" },
            { name: "Maria Lopez", email: "maria@quietstay.ch", role: "staff" },
            { name: "Pierre Blanc", email: "pierre@quietstay.ch", role: "staff" },
            { name: "Jean-Pierre Muller", email: "jp.muller@example.ch", role: "owner" },
          ].map((m, i) => (
            <div key={i} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                  {m.name.split(" ").map(w => w[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">{m.name}</p>
                  <p className="text-xs text-stone-500">{m.email}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${m.role === "admin" ? "bg-violet-100 text-violet-700" : m.role === "staff" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"} capitalize`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
}
