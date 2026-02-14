"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import {
  Home, Building2, CalendarDays, SprayCan, Users, FileText,
  Settings, LogOut, Plus, Search, ChevronDown, X,
  Key, Lock,
  Smartphone, Hash, Camera, Menu, Bell,
  ArrowUpRight, TrendingUp, MapPin, Phone, Mail,
  MoreHorizontal, Image, Trash2, Eye, Send, CheckCircle, Pencil, Download,
  BedDouble, Plane, Loader2, UserCheck, DollarSign, Clock,
  ChevronLeft, ChevronRight, Calendar
} from "lucide-react";
import ICalSyncSection from "@/components/ICalSyncSection";
import { supabase } from "@/lib/supabase";
import {
  useAuth, useOwners, useProperties, useBookings, useCleanings,
  useAccesses, useInvoices, useProfiles, useDashboardKPIs, useReports,
  useRealtimeBookings, useRealtimeCleanings
} from "@/hooks/useSupabase";
import type {
  Profile, Owner, Property, Booking, Cleaning, Access, Invoice,
  AccessType, CleaningType, CleaningStatus, BookingStatus,
  DashboardKPIs as KPIsType, TodayMovement, Report, ReportData,
  NotificationEventType, PropertyProfitability
} from "@/types";
import { useProfitability } from "@/hooks/useProfitability";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useWhatsAppNotifier } from "@/hooks/useWhatsAppNotifier";
import { useCompanySettings } from "@/hooks/useCompanySettings";

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-CH");
const nights = (a: string, b: string) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 864e5);

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-emerald-100 text-emerald-800", checked_out: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-800", in_progress: "bg-sky-100 text-sky-800",
  done: "bg-teal-100 text-teal-800", validated: "bg-emerald-100 text-emerald-800",
  issue: "bg-red-100 text-red-800", draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-800", paid: "bg-emerald-100 text-emerald-800",
  active: "bg-emerald-100 text-emerald-800", inactive: "bg-slate-100 text-slate-600",
  maintenance: "bg-amber-100 text-amber-800",
  conflict: "bg-red-100 text-red-800",
};

const STATUS_FR: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", checked_in: "En cours",
  checked_out: "Terminée", cancelled: "Annulée", in_progress: "En cours",
  done: "Terminé", validated: "Validé", issue: "Problème",
  draft: "Brouillon", sent: "Envoyée", paid: "Payée",
  active: "Actif", inactive: "Inactif", maintenance: "Maintenance",
  conflict: "Conflit",
};

const PLATFORM_COLORS: Record<string, string> = {
  airbnb: "bg-rose-500", booking: "bg-blue-600", direct: "bg-violet-600", other: "bg-slate-500"
};

const PROPERTY_ICONS: Record<string, string> = {
  apartment: "\u{1F3E2}", house: "\u{1F3E0}", studio: "\u{1F3D9}\u{FE0F}", chalet: "\u{1F3D4}\u{FE0F}", villa: "\u{1F3DB}\u{FE0F}"
};

const ACCESS_ICONS: Record<string, typeof Hash> = { code: Hash, key: Key, lockbox: Lock, smartlock: Smartphone };

const INPUT_CLASS = "w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400";

const CANTONS = ["AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"];

const DEFAULT_CHECKLIST = [
  { id: "1", label: "Aspirateur / balai passé", checked: false },
  { id: "2", label: "Surfaces nettoyées", checked: false },
  { id: "3", label: "Salle de bain nettoyée", checked: false },
  { id: "4", label: "Cuisine nettoyée", checked: false },
  { id: "5", label: "Draps changés", checked: false },
  { id: "6", label: "Serviettes remplacées", checked: false },
  { id: "7", label: "Poubelles vidées", checked: false },
  { id: "8", label: "Produits d\u2019accueil vérifiés", checked: false },
  { id: "9", label: "Fenêtres fermées", checked: false },
  { id: "10", label: "Vérification générale", checked: false },
];

// ─── SHARED COMPONENTS ──────────────────────────────────────

function Badge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"} ${className}`}>
      {STATUS_FR[status] || status}
    </span>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700">{label}</label>
      {children}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function QuietStayDashboard() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Supabase data hooks
  const ownersHook = useOwners();
  const propertiesHook = useProperties();
  const bookingsHook = useBookings();
  const cleaningsHook = useCleanings();
  const accessesHook = useAccesses();
  const invoicesHook = useInvoices();
  const profilesHook = useProfiles();
  const kpisHook = useDashboardKPIs();
  const reportsHook = useReports();

  // Track loading + which pages have been loaded
  const [dataReady, setDataReady] = useState(false);
  const loadedPages = useRef(new Set<string>());

  // Essential data: KPIs, properties, bookings, owners (needed for dashboard, notifications, search)
  useEffect(() => {
    if (!user) return;

    // Timeout: show dashboard after 8s even if queries haven't finished
    const timeout = setTimeout(() => setDataReady(true), 8000);

    // allSettled: don't block if some queries fail (e.g. Supabase cold start)
    Promise.allSettled([
      kpisHook.fetch(),
      propertiesHook.fetchWithOwners(),
      bookingsHook.fetchWithProperty(),
      ownersHook.fetch(),
    ]).then(() => {
      clearTimeout(timeout);
      setDataReady(true);
    });

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Lazy-load per page: only fetch when navigating to that section
  useEffect(() => {
    if (!user || !dataReady) return;
    if (loadedPages.current.has(page)) return;
    loadedPages.current.add(page);

    switch (page) {
      case "cleanings":
        cleaningsHook.fetchFull();
        profilesHook.fetch();
        break;
      case "properties":
        accessesHook.fetch();
        break;
      case "invoices":
        invoicesHook.fetchWithOwners();
        break;
      case "settings":
        profilesHook.fetch();
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataReady, page]);

  // ─── WhatsApp realtime notifications ───────────────────────
  const { sendNotification } = useWhatsAppNotifier();

  useRealtimeBookings(useCallback((payload: unknown) => {
    // Refresh only bookings + KPIs (not all 8 tables)
    bookingsHook.fetchWithProperty();
    kpisHook.fetch();

    const p = payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> };
    const b = p.new;
    const propName = propertiesHook.data.find(pr => pr.id === b.property_id)?.name || "Logement";
    if (p.eventType === "INSERT" && b.status !== "cancelled") {
      sendNotification("booking_created", `Nouvelle réservation : ${b.guest_name} du ${fmtDate(b.check_in as string)} au ${fmtDate(b.check_out as string)} à ${propName}`, "bookings", b.id as string);
      if (b.is_conflict) {
        sendNotification("overbooking", `Conflit détecté : ${b.guest_name} (${fmtDate(b.check_in as string)} - ${fmtDate(b.check_out as string)}) à ${propName}`, "bookings", b.id as string);
      }
    }
    if (p.eventType === "UPDATE") {
      if (b.status === "cancelled" && p.old.status !== "cancelled") {
        sendNotification("booking_cancelled", `Réservation annulée : ${b.guest_name} (${fmtDate(b.check_in as string)} - ${fmtDate(b.check_out as string)}) à ${propName}`, "bookings", b.id as string);
      }
      if (b.is_conflict && !p.old.is_conflict) {
        sendNotification("overbooking", `Conflit détecté : ${b.guest_name} (${fmtDate(b.check_in as string)} - ${fmtDate(b.check_out as string)}) à ${propName}`, "bookings", b.id as string);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendNotification]));

  useRealtimeCleanings(useCallback((payload: unknown) => {
    // Refresh only cleanings (not all 8 tables)
    cleaningsHook.fetchFull();

    const p = payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> };
    if (p.eventType === "UPDATE") {
      const c = p.new;
      if (c.status === "issue" && p.old.status !== "issue") {
        const propName = propertiesHook.data.find(pr => pr.id === c.property_id)?.name || "Logement";
        sendNotification("incident_reported", `Incident signalé pour le ménage du ${fmtDate(c.scheduled_date as string)} à ${propName}`, "cleanings", c.id as string);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendNotification]));

  // ─── Search results ──────────────────────────────────────
  const searchResults = (() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const results: { type: string; label: string; sub: string; page: string }[] = [];
    propertiesHook.data.filter(p =>
      p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
    ).slice(0, 4).forEach(p => results.push({ type: "Logement", label: p.name, sub: `${p.city} (${p.canton})`, page: "properties" }));
    bookingsHook.data.filter(b =>
      b.guest_name.toLowerCase().includes(q) || (b.property?.name || "").toLowerCase().includes(q)
    ).slice(0, 4).forEach(b => results.push({ type: "Réservation", label: b.guest_name, sub: b.property?.name || "", page: "bookings" }));
    ownersHook.data.filter(o =>
      o.name.toLowerCase().includes(q) || (o.company || "").toLowerCase().includes(q) || o.email.toLowerCase().includes(q)
    ).slice(0, 4).forEach(o => results.push({ type: "Propriétaire", label: o.name, sub: o.email, page: "owners" }));
    return results.slice(0, 8);
  })();

  // ─── Notifications ──────────────────────────────────────
  const notifications = (() => {
    const notifs: { id: string; icon: typeof Home; color: string; message: string; time: string }[] = [];
    // Conflicts
    const conflicts = bookingsHook.data.filter(b => b.is_conflict && b.status !== "cancelled");
    if (conflicts.length > 0) {
      notifs.push({ id: "conflicts", icon: CalendarDays, color: "text-red-600 bg-red-50", message: `${conflicts.length} conflit${conflicts.length > 1 ? "s" : ""} de réservation détecté${conflicts.length > 1 ? "s" : ""}`, time: "Maintenant" });
    }
    // Today check-ins
    const today = new Date().toISOString().slice(0, 10);
    const todayCheckins = bookingsHook.data.filter(b => b.check_in.slice(0, 10) === today && b.status !== "cancelled");
    if (todayCheckins.length > 0) {
      notifs.push({ id: "checkins", icon: ArrowUpRight, color: "text-blue-600 bg-blue-50", message: `${todayCheckins.length} arrivée${todayCheckins.length > 1 ? "s" : ""} aujourd'hui`, time: "Aujourd'hui" });
    }
    // Today check-outs
    const todayCheckouts = bookingsHook.data.filter(b => b.check_out.slice(0, 10) === today && b.status !== "cancelled");
    if (todayCheckouts.length > 0) {
      notifs.push({ id: "checkouts", icon: ArrowUpRight, color: "text-amber-600 bg-amber-50", message: `${todayCheckouts.length} départ${todayCheckouts.length > 1 ? "s" : ""} aujourd'hui`, time: "Aujourd'hui" });
    }
    // Pending cleanings
    const pendingCleanings = cleaningsHook.data.filter(c => c.status === "pending" && c.scheduled_date.slice(0, 10) <= today);
    if (pendingCleanings.length > 0) {
      notifs.push({ id: "cleanings", icon: SprayCan, color: "text-violet-600 bg-violet-50", message: `${pendingCleanings.length} ménage${pendingCleanings.length > 1 ? "s" : ""} en attente`, time: "Aujourd'hui" });
    }
    // Draft invoices
    const draftInvoices = invoicesHook.data.filter(i => i.status === "draft");
    if (draftInvoices.length > 0) {
      notifs.push({ id: "invoices", icon: FileText, color: "text-stone-600 bg-stone-100", message: `${draftInvoices.length} facture${draftInvoices.length > 1 ? "s" : ""} en brouillon`, time: "En attente" });
    }
    return notifs;
  })();

  const unreadNotifs = notifications.filter(n => !readNotifIds.has(n.id));
  const unreadCount = unreadNotifs.length;

  function markNotifRead(id: string) {
    setReadNotifIds(prev => new Set(prev).add(id));
  }
  function markAllNotifsRead() {
    setReadNotifIds(new Set(notifications.map(n => n.id)));
  }
  function dismissNotif(id: string) {
    markNotifRead(id);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      setLoginError("Email ou mot de passe incorrect");
    } else {
      setLoginEmail("");
      setLoginPassword("");
    }
    setLoginLoading(false);
  }

  const NAV = [
    { id: "dashboard", label: "Tableau de bord", icon: Home },
    { id: "properties", label: "Logements", icon: Building2 },
    { id: "bookings", label: "Réservations", icon: CalendarDays },
    { id: "planning", label: "Planning", icon: Calendar },
    { id: "cleanings", label: "Ménages", icon: SprayCan },
    { id: "owners", label: "Propriétaires", icon: Users },
    { id: "invoices", label: "Facturation", icon: FileText },
    { id: "profitability", label: "Rentabilité", icon: DollarSign },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage kpis={kpisHook.kpis} movements={kpisHook.movements} loading={kpisHook.loading} />;
      case "properties": return <PropertiesPage properties={propertiesHook.data} bookings={bookingsHook.data} accesses={accessesHook.data} owners={ownersHook.data} onCreate={propertiesHook.create} onRemove={propertiesHook.remove} onCreateAccess={accessesHook.create} onRefreshAccesses={accessesHook.fetch} />;
      case "bookings": return <BookingsPage bookings={bookingsHook.data} properties={propertiesHook.data} onCreate={bookingsHook.create} onUpdate={bookingsHook.update} />;
      case "planning": return <PlanningPage bookings={bookingsHook.data} properties={propertiesHook.data} />;
      case "cleanings": return <CleaningsPage cleanings={cleaningsHook.data} properties={propertiesHook.data} bookings={bookingsHook.data} profiles={profilesHook.data} onUpdate={cleaningsHook.update} onCreate={cleaningsHook.create} onRemove={cleaningsHook.remove} />;
      case "owners": return <OwnersPage owners={ownersHook.data} properties={propertiesHook.data} invoices={invoicesHook.data} onCreate={ownersHook.create} onRemove={ownersHook.remove} />;
      case "invoices": return <InvoicesPage invoices={invoicesHook.data} owners={ownersHook.data} onUpdate={invoicesHook.update} onRemove={invoicesHook.remove} onGenerate={invoicesHook.generateMonthly} reportsHook={reportsHook} />;
      case "profitability": return <ProfitabilityPage />;
      case "settings": return <SettingsPage currentUser={user!} />;
      default: return <DashboardPage kpis={kpisHook.kpis} movements={kpisHook.movements} loading={kpisHook.loading} />;
    }
  };

  // ─── Auth Loading ──────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <span className="text-white text-xl font-bold">QS</span>
          </div>
          <Loader2 size={24} className="animate-spin text-stone-400 mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Data Loading ──────────────────────────────────────────
  if (user && !dataReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <span className="text-white text-xl font-bold">QS</span>
          </div>
          <Loader2 size={24} className="animate-spin text-amber-500 mx-auto" />
          <p className="text-sm text-stone-500">Chargement des données…</p>
        </div>
      </div>
    );
  }

  // ─── Login Screen ──────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="w-full max-w-sm mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <span className="text-white text-xl font-bold">QS</span>
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mt-4">QuietStay Ops</h1>
            <p className="text-sm text-stone-500 mt-1">Connectez-vous pour accéder au tableau de bord</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }}
                placeholder="votre@email.ch"
                className={INPUT_CLASS}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Mot de passe</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }}
                placeholder="••••••••"
                className={INPUT_CLASS}
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loginError}</p>
            )}
            <button type="submit" disabled={loginLoading}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loginLoading && <Loader2 size={16} className="animate-spin" />}
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-stone-50 text-stone-800 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} transition-all duration-300 bg-stone-900 text-stone-200 flex flex-col shrink-0 ${showMobileMenu ? "fixed inset-y-0 left-0 z-50" : "hidden md:flex"}`}>
        <div className={`h-16 flex items-center ${sidebarOpen ? "px-6" : "px-4 justify-center"} border-b border-stone-700/50`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-white text-sm font-bold">QS</span>
              </div>
              <div>
                <h1 className="font-serif text-base font-normal text-white tracking-tight">QuietStay</h1>
                <p className="text-[10px] text-stone-400 tracking-widest uppercase">Ops</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">QS</span>
            </div>
          )}
        </div>

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

        <div className={`p-4 border-t border-stone-700/50 ${sidebarOpen ? "" : "flex justify-center"}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center text-xs font-medium text-white">
                {(user.full_name || user.email).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.full_name || user.email}</p>
                <p className="text-xs text-stone-500 capitalize">{user.role}</p>
              </div>
              <button onClick={signOut} className="text-stone-500 hover:text-stone-300" title="Déconnexion">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={signOut} className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white hover:bg-stone-600 transition-colors" title="Déconnexion">
              {(user.full_name || user.email).slice(0, 2).toUpperCase()}
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center px-4 md:px-8 gap-4 shrink-0">
          <button className="md:hidden text-stone-500" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            <Menu size={22} />
          </button>
          <button className="hidden md:block text-stone-400 hover:text-stone-600"
            onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={20} />
          </button>

          <div className="flex-1 max-w-md relative">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="text" value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Rechercher logement, réservation, propriétaire..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-100 border-0 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-stone-200 shadow-lg z-50 overflow-hidden">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => { setPage(r.page); setSearchTerm(""); setSearchOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 w-24 shrink-0">{r.type}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{r.label}</p>
                      <p className="text-xs text-stone-500 truncate">{r.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 relative">
            <button onClick={() => { setNotificationsOpen(!notificationsOpen); setSearchOpen(false); }} className="relative p-2 rounded-xl hover:bg-stone-100 text-stone-500">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-xl border border-stone-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-900">Notifications</p>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotifsRead} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-stone-400">Aucune notification</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map(n => {
                      const Icon = n.icon;
                      const isRead = readNotifIds.has(n.id);
                      return (
                        <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-stone-50 last:border-0 transition-colors ${isRead ? "opacity-50" : "bg-amber-50/30"}`}>
                          <button onClick={() => {
                            markNotifRead(n.id);
                            if (n.id === "conflicts" || n.id === "checkins" || n.id === "checkouts") setPage("bookings");
                            else if (n.id === "cleanings") setPage("cleanings");
                            else if (n.id === "invoices") setPage("invoices");
                            setNotificationsOpen(false);
                          }} className="flex items-start gap-3 flex-1 text-left min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${n.color}`}><Icon size={14} /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-stone-900">{n.message}</p>
                              <p className="text-xs text-stone-400 mt-0.5">{n.time}</p>
                            </div>
                          </button>
                          {!isRead && (
                            <button onClick={() => dismissNotif(n.id)} className="shrink-0 p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 mt-0.5" title="Marquer comme lu">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>

      {(searchOpen || notificationsOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setSearchOpen(false); setNotificationsOpen(false); }} />
      )}

      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
      )}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────
function DashboardPage({ kpis, movements, loading }: {
  kpis: KPIsType | null; movements: TodayMovement[]; loading: boolean;
}) {
  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  const KPIs = [
    { label: "Logements actifs", value: kpis.total_properties, icon: Building2, color: "from-blue-500 to-indigo-600" },
    { label: "Réservations actives", value: kpis.active_bookings, icon: CalendarDays, color: "from-emerald-500 to-teal-600" },
    { label: "Ménages en attente", value: kpis.pending_cleanings, icon: SprayCan, color: "from-amber-500 to-orange-600" },
    { label: "Revenu du mois", value: fmt(kpis.monthly_revenue), icon: TrendingUp, color: "from-violet-500 to-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Tableau de bord</h2>
        <p className="text-sm text-stone-500 mt-1">Vue d&apos;ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIs.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg hover:shadow-stone-200/50 transition-all">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                <kpi.icon size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-stone-900 mt-3">{kpi.value}</p>
            <p className="text-sm text-stone-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {kpis.conflicts_count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">
                {kpis.conflicts_count} conflit{kpis.conflicts_count > 1 ? "s" : ""} de réservation
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Des réservations se chevauchent sur les mêmes logements. Vérifiez la page Réservations.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-900 mb-4">Taux d&apos;occupation</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e7e5e4" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${kpis.occupancy_rate}, 100`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-stone-900">{kpis.occupancy_rate}%</span>
            </div>
            <div>
              <p className="text-sm text-stone-500">Arrivées aujourd&apos;hui : <span className="font-semibold text-stone-900">{kpis.arrivals_today}</span></p>
              <p className="text-sm text-stone-500">Départs aujourd&apos;hui : <span className="font-semibold text-stone-900">{kpis.departures_today}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-900 mb-4">Mouvements du jour</h3>
          {movements.length === 0 ? (
            <p className="text-sm text-stone-400">Aucun mouvement aujourd&apos;hui</p>
          ) : (
            <div className="space-y-3">
              {movements.slice(0, 5).map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-stone-900">{m.guest_name}</span>
                    <span className="text-stone-400 ml-2">{m.property_name}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.movement_type === "arrival" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {m.movement_type === "arrival" ? "Arrivée" : "Départ"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PROPERTIES ──────────────────────────────────────────────
function PropertiesPage({ properties, bookings, accesses, owners, onCreate, onRemove, onCreateAccess, onRefreshAccesses }: {
  properties: Property[]; bookings: Booking[]; accesses: Access[]; owners: Owner[];
  onCreate: (item: Partial<Property>) => Promise<unknown>;
  onRemove: (id: string) => Promise<void>;
  onCreateAccess: (item: Partial<Access>) => Promise<unknown>;
  onRefreshAccesses: () => Promise<void>;
}) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOwnerId, setNewOwnerId] = useState(owners[0]?.id || "");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCanton, setNewCanton] = useState("GE");
  const [newType, setNewType] = useState("apartment");
  const [newBedrooms, setNewBedrooms] = useState(1);
  const [newMaxGuests, setNewMaxGuests] = useState(2);
  const [saving, setSaving] = useState(false);
  // Access fields
  const [newAccessType, setNewAccessType] = useState<AccessType>("code");
  const [newAccessLabel, setNewAccessLabel] = useState("");
  const [newAccessValue, setNewAccessValue] = useState("");
  const [newAccessInstructions, setNewAccessInstructions] = useState("");

  useEffect(() => { if (owners.length > 0 && !newOwnerId) setNewOwnerId(owners[0].id); }, [owners, newOwnerId]);

  const filtered = filter === "all" ? properties : properties.filter(p => p.status === filter);

  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const result = await onCreate({
        owner_id: newOwnerId,
        name: newName.trim(),
        address: newAddress.trim(),
        city: newCity.trim(),
        canton: newCanton,
        property_type: newType as Property["property_type"],
        bedrooms: newBedrooms,
        max_guests: newMaxGuests,
        status: "active" as const,
      });
      // Create access if value provided
      if (newAccessValue.trim() && result && (result as Property).id) {
        await onCreateAccess({
          property_id: (result as Property).id,
          type: newAccessType,
          label: newAccessLabel.trim() || "Entrée principale",
          value: newAccessValue.trim(),
          instructions: newAccessInstructions.trim() || null,
          is_active: true,
        } as Partial<Access>);
        await onRefreshAccesses();
      }
      setShowAdd(false);
      setNewName(""); setNewAddress(""); setNewCity("");
      setNewAccessLabel(""); setNewAccessValue(""); setNewAccessInstructions("");
    } catch { /* handled by hook */ }
    setSaving(false);
  }

  async function handleDeleteProperty(id: string, name: string) {
    if (!confirm(`Supprimer le logement "${name}" et toutes ses données associées ?`)) return;
    await onRemove(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Logements</h2>
          <p className="text-sm text-stone-500 mt-1">{properties.length} logements gérés</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Ajouter un logement
        </button>
      </div>

      <div className="flex gap-2">
        {[{ v: "all", l: "Tous" }, { v: "active", l: "Actifs" }, { v: "maintenance", l: "Maintenance" }, { v: "inactive", l: "Inactifs" }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.v ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"}`}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const owner = owners.find(o => o.id === p.owner_id) || p.owner;
          const pBookings = bookings.filter(b => b.property_id === p.id && b.status !== "cancelled");
          const access = accesses.filter(a => a.property_id === p.id);
          return (
            <div key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:shadow-stone-200/50 transition-all cursor-pointer group">
              <div className={`h-28 bg-gradient-to-br ${p.status === "active" ? "from-stone-800 to-stone-900" : p.status === "maintenance" ? "from-amber-700 to-amber-900" : "from-stone-500 to-stone-600"} relative flex items-end p-5`}>
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProperty(p.id, p.name); }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white/60 hover:text-white transition-colors backdrop-blur-sm"
                    title="Supprimer le logement"
                  >
                    <Trash2 size={14} />
                  </button>
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
                  <span className="flex items-center gap-1"><CalendarDays size={13} /> {pBookings.length} rés.</span>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-xs text-stone-500">
                    <span className="font-medium text-stone-700">{owner?.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {access.map(a => {
                      const I = ACCESS_ICONS[a.type];
                      return I ? <div key={a.id} className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center" title={`${a.label}: ${a.value}`}><I size={12} className="text-stone-500" /></div> : null;
                    })}
                  </div>
                </div>
              </div>

              {selected === p.id && (
                <div className="border-t border-stone-100 px-5 py-4 bg-stone-50 space-y-3" onClick={e => e.stopPropagation()}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Accès</h4>
                  {access.length === 0 && <p className="text-xs text-stone-400">Aucun accès configuré</p>}
                  {access.map(a => (
                    <div key={a.id} className="flex items-center gap-3 text-sm">
                      {(() => { const I = ACCESS_ICONS[a.type]; return I ? <I size={14} className="text-stone-500" /> : null; })()}
                      <span className="font-medium">{a.label}:</span>
                      <code className="px-2 py-0.5 rounded bg-stone-200 text-xs font-mono">{a.value}</code>
                      {a.instructions && <span className="text-xs text-stone-400">&mdash; {a.instructions}</span>}
                    </div>
                  ))}
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 pt-2">Réservations récentes</h4>
                  {pBookings.slice(0, 3).map(b => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span>{b.guest_name}</span>
                      <span className="text-xs text-stone-500">{fmtDate(b.check_in)} &rarr; {fmtDate(b.check_out)}</span>
                      <Badge status={b.status} />
                    </div>
                  ))}
                  <div className="pt-3 border-t border-stone-200">
                    <ICalSyncSection propertyId={p.id} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un logement">
        <form onSubmit={handleAddProperty} className="space-y-4">
          <FormField label="Nom du logement">
            <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className={INPUT_CLASS} placeholder="Ex: Studio Pâquis" />
          </FormField>
          <FormField label="Propriétaire">
            <select value={newOwnerId} onChange={e => setNewOwnerId(e.target.value)} className={INPUT_CLASS}>
              {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Adresse"><input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Ville"><input type="text" value={newCity} onChange={e => setNewCity(e.target.value)} className={INPUT_CLASS} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Canton">
              <select value={newCanton} onChange={e => setNewCanton(e.target.value)} className={INPUT_CLASS}>
                {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Type">
              <select value={newType} onChange={e => setNewType(e.target.value)} className={INPUT_CLASS}>
                <option value="studio">Studio</option><option value="apartment">Appartement</option>
                <option value="house">Maison</option><option value="chalet">Chalet</option><option value="villa">Villa</option>
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Chambres"><input type="number" min={0} value={newBedrooms} onChange={e => setNewBedrooms(+e.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Capacité max"><input type="number" min={1} value={newMaxGuests} onChange={e => setNewMaxGuests(+e.target.value)} className={INPUT_CLASS} /></FormField>
          </div>
          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-sm font-semibold text-stone-700 mb-3">Accès principal (optionnel)</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Type d&apos;accès">
                  <select value={newAccessType} onChange={e => setNewAccessType(e.target.value as AccessType)} className={INPUT_CLASS}>
                    <option value="code">Code</option>
                    <option value="key">Clé</option>
                    <option value="lockbox">Boîte à clés</option>
                    <option value="smartlock">Serrure connectée</option>
                  </select>
                </FormField>
                <FormField label="Libellé">
                  <input type="text" value={newAccessLabel} onChange={e => setNewAccessLabel(e.target.value)} className={INPUT_CLASS} placeholder="Ex: Porte immeuble" />
                </FormField>
              </div>
              <FormField label="Code / Valeur">
                <input type="text" value={newAccessValue} onChange={e => setNewAccessValue(e.target.value)} className={INPUT_CLASS} placeholder="Ex: 4589# ou Trousseau #5" />
              </FormField>
              <FormField label="Instructions">
                <textarea value={newAccessInstructions} onChange={e => setNewAccessInstructions(e.target.value)} rows={2} className={INPUT_CLASS} placeholder="Instructions d&apos;accès..." />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── BOOKINGS ────────────────────────────────────────────────
function BookingsPage({ bookings, properties, onCreate, onUpdate }: {
  bookings: Booking[]; properties: Property[];
  onCreate: (item: Partial<Booking>) => Promise<unknown>;
  onUpdate: (id: string, updates: Partial<Booking>) => Promise<unknown>;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [bPropId, setBPropId] = useState(properties[0]?.id || "");
  const [bPlatform, setBPlatform] = useState("airbnb");
  const [bCheckIn, setBCheckIn] = useState(today);
  const [bCheckOut, setBCheckOut] = useState(today);
  const [bGuestName, setBGuestName] = useState("");
  const [bGuestPhone, setBGuestPhone] = useState("");
  const [bGuestCount, setBGuestCount] = useState(1);
  const [bAmount, setBAmount] = useState(0);
  const [bCommission, setBCommission] = useState(20);
  const [bStatus, setBStatus] = useState("confirmed");

  useEffect(() => { if (properties.length > 0 && !bPropId) setBPropId(properties[0].id); }, [properties, bPropId]);

  const filtered = bookings.filter(b => {
    if (statusFilter === "conflicts") return b.is_conflict === true;
    return (statusFilter === "all" || b.status === statusFilter) &&
      (platformFilter === "all" || b.platform === platformFilter);
  }).sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());

  async function handleAddBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!bGuestName.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({
        property_id: bPropId,
        platform: bPlatform as Booking["platform"],
        check_in: bCheckIn,
        check_out: bCheckOut,
        guest_name: bGuestName.trim(),
        guest_phone: bGuestPhone || null,
        guest_count: bGuestCount,
        total_amount: bAmount,
        commission_rate: bCommission,
        status: bStatus as Booking["status"],
      });
      setShowAdd(false);
      setBGuestName(""); setBGuestPhone(""); setBAmount(0);
    } catch { /* handled by hook */ }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Réservations</h2>
          <p className="text-sm text-stone-500 mt-1">{bookings.length} réservations totales</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Nouvelle réservation
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ v: "all", l: "Toutes" }, { v: "conflicts", l: "Conflits" }, { v: "pending", l: "En attente" }, { v: "confirmed", l: "Confirmées" }, { v: "checked_in", l: "En cours" }, { v: "checked_out", l: "Terminées" }].map(f => (
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

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              {["Voyageur", "Logement", "Plateforme", "Arrivée", "Départ", "Nuits", "Montant", "Statut", "Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filtered.map(b => {
              const prop = properties.find(p => p.id === b.property_id) || b.property;
              return (
                <tr key={b.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-stone-900">{b.guest_name}</p>
                    {b.guest_phone && <p className="text-xs text-stone-500">{b.guest_phone}</p>}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">{prop?.name || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${PLATFORM_COLORS[b.platform] || ""}`} />
                    <span className="text-sm capitalize">{b.platform}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">{fmtDate(b.check_in)}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{fmtDate(b.check_out)}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{nights(b.check_in, b.check_out)}</td>
                  <td className="px-5 py-4 text-sm font-medium text-stone-900">{fmt(b.total_amount || 0)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Badge status={b.status} />
                      {b.is_conflict && <Badge status="conflict" />}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={b.status}
                      onChange={(e) => onUpdate(b.id, { status: e.target.value as BookingStatus })}
                      className="text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    >
                      <option value="pending">En attente</option>
                      <option value="confirmed">Confirmée</option>
                      <option value="checked_in">En cours</option>
                      <option value="checked_out">Terminée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle réservation">
        <form onSubmit={handleAddBooking} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Logement">
              <select value={bPropId} onChange={e => setBPropId(e.target.value)} className={INPUT_CLASS}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField label="Plateforme">
              <select value={bPlatform} onChange={e => setBPlatform(e.target.value)} className={INPUT_CLASS}>
                <option value="airbnb">Airbnb</option><option value="booking">Booking.com</option>
                <option value="direct">Direct</option><option value="other">Autre</option>
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Arrivée"><input type="date" value={bCheckIn} onChange={e => setBCheckIn(e.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Départ"><input type="date" value={bCheckOut} onChange={e => setBCheckOut(e.target.value)} className={INPUT_CLASS} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nom du voyageur"><input type="text" required value={bGuestName} onChange={e => setBGuestName(e.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Téléphone"><input type="tel" value={bGuestPhone} onChange={e => setBGuestPhone(e.target.value)} className={INPUT_CLASS} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Personnes"><input type="number" min={1} value={bGuestCount} onChange={e => setBGuestCount(+e.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Montant CHF"><input type="number" min={0} value={bAmount} onChange={e => setBAmount(+e.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Commission %"><input type="number" min={0} max={100} value={bCommission} onChange={e => setBCommission(+e.target.value)} className={INPUT_CLASS} /></FormField>
          </div>
          <FormField label="Statut">
            <select value={bStatus} onChange={e => setBStatus(e.target.value)} className={INPUT_CLASS}>
              <option value="pending">En attente</option><option value="confirmed">Confirmée</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── CLEANINGS ───────────────────────────────────────────────
function CleaningsPage({ cleanings, properties, bookings, profiles, onUpdate, onCreate, onRemove }: {
  cleanings: Cleaning[]; properties: Property[]; bookings: Booking[]; profiles: Profile[];
  onUpdate: (id: string, updates: Partial<Cleaning>) => Promise<unknown>;
  onCreate: (item: Partial<Cleaning>) => Promise<unknown>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showReport, setShowReport] = useState<{ id: string; status: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Add cleaning form
  const today = new Date().toISOString().split("T")[0];
  const [newPropertyId, setNewPropertyId] = useState(properties[0]?.id || "");
  const [newDate, setNewDate] = useState(today);
  const [newType, setNewType] = useState<CleaningType>("checkout");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newCost, setNewCost] = useState(80);

  // Report modal
  const [reportNotes, setReportNotes] = useState("");

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingIdRef = useRef<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Notes editing
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});

  useEffect(() => { if (properties.length > 0 && !newPropertyId) setNewPropertyId(properties[0].id); }, [properties, newPropertyId]);

  const filtered = cleanings.filter(c => filter === "all" || c.status === filter);

  async function handleAddCleaning(e: React.FormEvent) {
    e.preventDefault();
    if (!newPropertyId || saving) return;
    setSaving(true);
    try {
      await onCreate({
        property_id: newPropertyId,
        scheduled_date: newDate,
        type: newType,
        assigned_to: newAssignedTo || null,
        cost: newCost,
        status: "pending" as CleaningStatus,
        checklist: DEFAULT_CHECKLIST,
      } as Partial<Cleaning>);
      setShowAdd(false);
      setNewDate(today); setNewType("checkout"); setNewAssignedTo(""); setNewCost(80);
    } catch { /* handled by hook */ }
    setSaving(false);
  }

  async function handleStatusChange(cleaning: Cleaning, newStatus: CleaningStatus) {
    if (newStatus === cleaning.status) return;
    // For validated/issue, open report modal for notes
    if (newStatus === "validated" || newStatus === "issue") {
      setShowReport({ id: cleaning.id, status: newStatus });
      setReportNotes("");
      return;
    }
    const updates: Partial<Cleaning> = { status: newStatus };
    if (newStatus === "in_progress" && !cleaning.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (newStatus === "done" && !cleaning.finished_at) {
      updates.finished_at = new Date().toISOString();
    }
    try {
      await onUpdate(cleaning.id, updates);
    } catch (err) {
      alert(`Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`);
    }
  }

  async function submitReport() {
    if (!showReport) return;
    setSaving(true);
    const cleaning = cleanings.find(c => c.id === showReport.id);
    const updates: Partial<Cleaning> = {
      status: showReport.status as CleaningStatus,
      notes: reportNotes || null,
    };
    if (showReport.status === "validated") {
      updates.validated_at = new Date().toISOString();
      if (cleaning && !cleaning.finished_at) {
        updates.finished_at = new Date().toISOString();
      }
    }
    try {
      await onUpdate(showReport.id, updates);
      setShowReport(null);
      setReportNotes("");
    } catch (err) {
      alert(`Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`);
    }
    setSaving(false);
  }

  function updateChecklist(cleaning: Cleaning, itemId: string, checked: boolean) {
    const source = cleaning.checklist && cleaning.checklist.length > 0 ? cleaning.checklist : DEFAULT_CHECKLIST;
    const updatedChecklist = source.map(item =>
      item.id === itemId ? { ...item, checked } : item
    );
    onUpdate(cleaning.id, { checklist: updatedChecklist } as Partial<Cleaning>);
  }

  function triggerPhotoUpload(cleaningId: string) {
    uploadingIdRef.current = cleaningId;
    setUploadingId(cleaningId);
    fileInputRef.current?.click();
  }

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const currentId = uploadingIdRef.current;
    if (!e.target.files || !currentId) return;
    const cleaning = cleanings.find(c => c.id === currentId);
    if (!cleaning) return;
    setSaving(true);
    const files = Array.from(e.target.files);
    const newPhotos = [...(cleaning.photos || [])];
    for (const file of files) {
      const path = `${currentId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('cleaning-photos').upload(path, file);
      if (error) {
        alert(`Erreur upload: ${error.message}`);
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('cleaning-photos').getPublicUrl(path);
      newPhotos.push(publicUrl);
    }
    if (newPhotos.length !== (cleaning.photos || []).length) {
      await onUpdate(currentId, { photos: newPhotos } as Partial<Cleaning>);
    }
    e.target.value = '';
    setUploadingId(null);
    uploadingIdRef.current = null;
    setSaving(false);
  }

  async function saveNotes(cleaningId: string) {
    const notes = editNotes[cleaningId];
    if (notes !== undefined) {
      await onUpdate(cleaningId, { notes: notes || null } as Partial<Cleaning>);
      setEditNotes(prev => { const next = { ...prev }; delete next[cleaningId]; return next; });
    }
  }

  const TYPE_FR: Record<string, string> = { checkout: "Ménage départ", checkin: "Préparation arrivée", deep: "Ménage approfondi", maintenance: "Maintenance" };
  const fmtTime = (iso: string) => { const d = new Date(iso); return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`; };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Ménages</h2>
          <p className="text-sm text-stone-500 mt-1">{cleanings.length} ménages planifiés</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Ajouter un ménage
        </button>
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
          const prop = properties.find(p => p.id === c.property_id);
          const booking = bookings.find(b => b.id === c.booking_id);
          const isExpanded = expanded === c.id;
          const isToday = c.scheduled_date === today;
          return (
            <div key={c.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${isToday ? "border-amber-300 shadow-md shadow-amber-100/50" : "border-stone-200"}`}>
              <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-stone-50 transition-colors" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.status === "pending" ? "bg-amber-100" : c.status === "in_progress" ? "bg-sky-100" : c.status === "done" ? "bg-teal-100" : c.status === "validated" ? "bg-emerald-100" : "bg-red-100"}`}>
                  <SprayCan size={18} className={c.status === "pending" ? "text-amber-600" : c.status === "in_progress" ? "text-sky-600" : c.status === "done" ? "text-teal-600" : c.status === "validated" ? "text-emerald-600" : "text-red-600"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900">{prop?.name || "—"}</p>
                    {isToday && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">Aujourd&apos;hui</span>}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {fmtDate(c.scheduled_date)} &middot; {TYPE_FR[c.type] || c.type}
                    {booking && ` \u00B7 ${booking.guest_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.assignee ? (
                    <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">{c.assignee.full_name}</span>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Non assigné</span>
                  )}
                  {c.cost != null && <span className="text-xs text-stone-500">{fmt(c.cost)}</span>}
                  <select
                    value={c.status}
                    onChange={(e) => { e.stopPropagation(); handleStatusChange(c, e.target.value as CleaningStatus); }}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs font-medium rounded-lg border-0 px-2.5 py-1 cursor-pointer ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}`}
                  >
                    <option value="pending">À faire</option>
                    <option value="in_progress">En cours</option>
                    <option value="done">Terminé</option>
                    <option value="validated">Validé</option>
                    <option value="issue">Problème</option>
                  </select>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer le ménage de ${prop?.name || "ce logement"} ?`)) onRemove(c.id); }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                  <ChevronDown size={16} className={`text-stone-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-stone-100 px-5 py-5 bg-stone-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Checklist */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Checklist</h4>
                      <div className="space-y-2">
                        {(c.checklist && c.checklist.length > 0 ? c.checklist : DEFAULT_CHECKLIST).map((item) => (
                          <label key={item.id} className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer hover:text-stone-900">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) => updateChecklist(c, item.id, e.target.checked)}
                              disabled={c.status === "validated"}
                              className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400 disabled:opacity-50"
                            />
                            <span className={item.checked ? "line-through text-stone-400" : ""}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Photos + Notes */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Photos</h4>
                        {c.photos && c.photos.length > 0 && (
                          <div className="flex gap-2 flex-wrap mb-3">
                            {c.photos.map((url, i) => (
                              <div key={i} className="relative group">
                                <img src={url} alt={`Photo ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border border-stone-200" />
                                {c.status !== "validated" && (
                                  <button onClick={() => {
                                    const updated = c.photos.filter((_: string, j: number) => j !== i);
                                    onUpdate(c.id, { photos: updated } as Partial<Cleaning>);
                                  }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {c.status !== "validated" && (
                          <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center">
                            <Camera size={24} className="mx-auto text-stone-400 mb-2" />
                            <p className="text-xs text-stone-500">Photos obligatoires avant validation</p>
                            <button onClick={() => triggerPhotoUpload(c.id)} className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-700">
                              {uploadingId === c.id ? "Envoi en cours..." : "Ajouter des photos"}
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Notes / Rapport</h4>
                        {editNotes[c.id] !== undefined ? (
                          <div>
                            <textarea
                              value={editNotes[c.id]}
                              onChange={e => setEditNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                              rows={3}
                              className={INPUT_CLASS}
                              placeholder="Ajouter une note..."
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => saveNotes(c.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Enregistrer</button>
                              <button onClick={() => setEditNotes(prev => { const next = { ...prev }; delete next[c.id]; return next; })} className="text-xs font-medium text-stone-400 hover:text-stone-600">Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {c.notes ? (
                              <p className="text-sm text-stone-600 bg-white rounded-lg p-3 border border-stone-200">{c.notes}</p>
                            ) : (
                              <p className="text-sm text-stone-400 italic">Aucune note</p>
                            )}
                            {c.status !== "validated" && (
                              <button onClick={() => setEditNotes(prev => ({ ...prev, [c.id]: c.notes || "" }))} className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-700">
                                {c.notes ? "Modifier" : "Ajouter une note"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info bar */}
                      <div className="flex items-center gap-4 text-xs text-stone-600 pt-2">
                        {c.assignee && <span className="flex items-center gap-1"><UserCheck size={12} /> {c.assignee.full_name}</span>}
                        {c.cost != null && <span className="flex items-center gap-1"><DollarSign size={12} /> {fmt(c.cost)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Horaires */}
                  <div className="pt-4 mt-4 border-t border-stone-200">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1"><Clock size={12} /> Horaires</h4>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-stone-500">Début</label>
                        <input
                          type="time"
                          value={c.started_at ? fmtTime(c.started_at) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const dt = new Date(c.scheduled_date + "T" + e.target.value + ":00");
                              onUpdate(c.id, { started_at: dt.toISOString() } as Partial<Cleaning>);
                            }
                          }}
                          className="px-2 py-1.5 rounded-lg border border-stone-200 text-sm w-28"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-stone-500">Fin</label>
                        <input
                          type="time"
                          value={c.finished_at ? fmtTime(c.finished_at) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const dt = new Date(c.scheduled_date + "T" + e.target.value + ":00");
                              onUpdate(c.id, { finished_at: dt.toISOString() } as Partial<Cleaning>);
                            }
                          }}
                          className="px-2 py-1.5 rounded-lg border border-stone-200 text-sm w-28"
                        />
                      </div>
                      {c.started_at && c.finished_at && (() => {
                        const diff = new Date(c.finished_at).getTime() - new Date(c.started_at).getTime();
                        if (diff <= 0) return null;
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return (
                          <span className="text-sm font-medium text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg">
                            Durée : {h}h{m.toString().padStart(2, "0")}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden file input for photo upload */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />

      {/* Add Cleaning Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un ménage">
        <form onSubmit={handleAddCleaning} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Logement">
              <select value={newPropertyId} onChange={e => setNewPropertyId(e.target.value)} className={INPUT_CLASS}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField label="Date prévue">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={INPUT_CLASS} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type">
              <select value={newType} onChange={e => setNewType(e.target.value as CleaningType)} className={INPUT_CLASS}>
                <option value="checkout">Ménage départ</option>
                <option value="checkin">Préparation arrivée</option>
                <option value="deep">Ménage approfondi</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </FormField>
            <FormField label="Assigné à">
              <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} className={INPUT_CLASS}>
                <option value="">Non assigné</option>
                {profiles.filter(p => p.role === "staff" || p.role === "admin").map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Coût (CHF)">
            <input type="number" min={0} step={10} value={newCost} onChange={e => setNewCost(+e.target.value)} className={INPUT_CLASS} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal open={!!showReport} onClose={() => setShowReport(null)} title={showReport?.status === "issue" ? "Signaler un problème" : "Validation du ménage"}>
        <div className="space-y-4">
          <FormField label={showReport?.status === "issue" ? "Description du problème" : "Commentaires de validation"}>
            <textarea
              value={reportNotes}
              onChange={e => setReportNotes(e.target.value)}
              rows={4}
              className={INPUT_CLASS}
              placeholder={showReport?.status === "issue" ? "Décrivez le problème rencontré..." : "Commentaires ou remarques..."}
              autoFocus
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowReport(null); setReportNotes(""); }} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Annuler</button>
            <button onClick={submitReport} disabled={saving}
              className={`px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 ${showReport?.status === "issue" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Confirmer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── OWNERS ──────────────────────────────────────────────────
function OwnersPage({ owners, properties, invoices, onCreate, onRemove }: {
  owners: Owner[]; properties: Property[]; invoices: Invoice[];
  onCreate: (item: Partial<Owner>) => Promise<unknown>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newIban, setNewIban] = useState("");

  async function handleAddOwner(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || null,
        company: newCompany.trim() || null,
        iban: newIban.trim() || null,
      });
      setShowAdd(false);
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewCompany(""); setNewIban("");
    } catch { /* handled by hook */ }
    setSaving(false);
  }

  async function handleDeleteOwner(id: string, name: string) {
    if (!confirm(`Supprimer le propriétaire "${name}" et toutes ses données associées (logements, réservations) ?`)) return;
    await onRemove(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Propriétaires</h2>
          <p className="text-sm text-stone-500 mt-1">{owners.length} propriétaires</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
          <Plus size={16} /> Ajouter un propriétaire
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {owners.map(o => {
          const ownerProps = properties.filter(p => p.owner_id === o.id);
          const ownerInvoices = invoices.filter(i => i.owner_id === o.id);
          const totalRevenue = ownerInvoices.reduce((s, i) => s + i.net_amount, 0);
          return (
            <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 hover:shadow-lg hover:shadow-stone-200/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center text-white font-medium">
                  {o.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900">{o.name}</p>
                  {o.company && <p className="text-xs text-stone-500">{o.company}</p>}
                </div>
                <button
                  onClick={() => handleDeleteOwner(o.id, o.name)}
                  className="text-stone-300 hover:text-red-500 transition-colors shrink-0"
                  title="Supprimer le propriétaire"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-stone-600"><Mail size={13} className="text-stone-400" />{o.email}</div>
                {o.phone && <div className="flex items-center gap-2 text-stone-600"><Phone size={13} className="text-stone-400" />{o.phone}</div>}
              </div>
              <div className="flex gap-4 pt-3 border-t border-stone-100">
                <div><p className="text-lg font-semibold text-stone-900">{ownerProps.length}</p><p className="text-xs text-stone-500">logements</p></div>
                <div><p className="text-lg font-semibold text-stone-900">{fmt(totalRevenue)}</p><p className="text-xs text-stone-500">revenus nets</p></div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un propriétaire">
        <form onSubmit={handleAddOwner} className="space-y-4">
          <FormField label="Nom complet"><input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className={INPUT_CLASS} /></FormField>
          <FormField label="Email"><input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className={INPUT_CLASS} /></FormField>
          <FormField label="Téléphone"><input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className={INPUT_CLASS} /></FormField>
          <FormField label="Entreprise"><input type="text" value={newCompany} onChange={e => setNewCompany(e.target.value)} className={INPUT_CLASS} /></FormField>
          <FormField label="IBAN"><input type="text" value={newIban} onChange={e => setNewIban(e.target.value)} className={INPUT_CLASS} placeholder="CH..." /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── INVOICES ────────────────────────────────────────────────
function InvoicesPage({ invoices, owners, onUpdate, onRemove, onGenerate, reportsHook }: {
  invoices: Invoice[]; owners: Owner[];
  onUpdate: (id: string, updates: Partial<Invoice>) => Promise<unknown>;
  onRemove: (id: string) => Promise<void>;
  onGenerate: (year: number, month: number) => Promise<unknown>;
  reportsHook: { data: Report[]; fetchByOwner: (id: string) => Promise<void>; generate: (ownerId: string, year: number, month: number) => Promise<unknown> };
}) {
  const [view, setView] = useState<"invoices" | "reports">("invoices");
  const [filter, setFilter] = useState("all");
  const [showGenerate, setShowGenerate] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);

  // Reports state
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);

  // PDF / Email states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (selectedOwnerId && view === "reports") {
      reportsHook.fetchByOwner(selectedOwnerId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOwnerId, view]);

  const filtered = invoices.filter(i => filter === "all" || i.status === filter)
    .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());

  const totalDraft = invoices.filter(i => i.status === "draft").reduce((s, i) => s + i.net_amount, 0);
  const totalSent = invoices.filter(i => i.status === "sent").reduce((s, i) => s + i.net_amount, 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.net_amount, 0);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const now = new Date();
      await onGenerate(now.getFullYear(), now.getMonth() + 1);
      setShowGenerate(false);
    } catch { /* handled by hook */ }
    setGenerating(false);
  }

  async function handleGenerateReport() {
    if (!selectedOwnerId) return;
    setGeneratingReport(true);
    try {
      await reportsHook.generate(selectedOwnerId, reportYear, reportMonth);
    } catch { /* handled by hook */ }
    setGeneratingReport(false);
  }

  async function handleDownloadPdf(invoiceId: string) {
    setDownloadingId(invoiceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la génération du PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${invoiceId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur lors de la génération du PDF"); }
    finally { setDownloadingId(null); }
  }

  async function handleSendEmail(invoiceId: string) {
    setEmailingId(invoiceId);
    setEmailResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/invoices/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = await res.json();
      setEmailResult({ ok: data.success, msg: data.message });
      if (data.success) {
        await onUpdate(invoiceId, { status: "sent" });
      }
    } catch { setEmailResult({ ok: false, msg: "Erreur réseau" }); }
    finally { setEmailingId(null); }
  }

  const currentMonth = new Date().toLocaleDateString("fr-CH", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Facturation</h2>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setView("invoices")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "invoices" ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}>
              <FileText size={14} className="inline mr-1.5 -mt-0.5" />Factures
            </button>
            <button onClick={() => setView("reports")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "reports" ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}>
              <TrendingUp size={14} className="inline mr-1.5 -mt-0.5" />Rapports
            </button>
          </div>
        </div>
        {view === "invoices" && (
          <button onClick={() => setShowGenerate(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10">
            <Plus size={16} /> Générer les factures du mois
          </button>
        )}
      </div>

      {view === "invoices" && (<>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Brouillons", value: fmt(totalDraft), count: invoices.filter(i => i.status === "draft").length, color: "text-stone-600", bg: "bg-stone-100" },
            { label: "Envoyées", value: fmt(totalSent), count: invoices.filter(i => i.status === "sent").length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Payées", value: fmt(totalPaid), count: invoices.filter(i => i.status === "paid").length, color: "text-emerald-600", bg: "bg-emerald-50" },
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
                const owner = owners.find(o => o.id === inv.owner_id) || inv.owner;
                return (
                  <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-stone-900">{owner?.name}</p>
                      {owner?.company && <p className="text-xs text-stone-500">{owner.company}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">{fmtDate(inv.period_start)} &rarr; {fmtDate(inv.period_end)}</td>
                    <td className="px-5 py-4 text-sm text-stone-900">{fmt(inv.total_revenue)}</td>
                    <td className="px-5 py-4 text-sm text-red-600">-{fmt(inv.commission_amount)}</td>
                    <td className="px-5 py-4 text-sm text-red-600">-{fmt(inv.cleaning_costs)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-stone-900">{fmt(inv.net_amount)}</td>
                    <td className="px-5 py-4"><Badge status={inv.status} /></td>
                    <td className="px-5 py-4 relative">
                      <button onClick={() => setOpenMenu(openMenu === inv.id ? null : inv.id)} className="text-stone-400 hover:text-stone-600"><MoreHorizontal size={16} /></button>
                      {openMenu === inv.id && (
                        <div className="absolute right-5 top-10 z-20 bg-white rounded-xl border border-stone-200 shadow-lg py-1 w-52" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setViewInvoice(inv); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                            <Eye size={14} /> Voir la facture
                          </button>
                          <button onClick={() => { handleDownloadPdf(inv.id); setOpenMenu(null); }}
                            disabled={downloadingId === inv.id}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50">
                            {downloadingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Télécharger PDF
                          </button>
                          <button onClick={() => { handleSendEmail(inv.id); setOpenMenu(null); }}
                            disabled={emailingId === inv.id}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50">
                            {emailingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                            Envoyer par email
                          </button>
                          <div className="border-t border-stone-100 my-1" />
                          <p className="px-4 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Changer le statut</p>
                          {(["draft", "sent", "paid"] as const).map(s => (
                            <button key={s} onClick={async () => { await onUpdate(inv.id, { status: s }); setOpenMenu(null); }}
                              disabled={inv.status === s}
                              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${inv.status === s ? "text-stone-300 cursor-default" : "text-stone-700 hover:bg-stone-50"}`}>
                              {s === "draft" && <><Pencil size={13} /> Brouillon</>}
                              {s === "sent" && <><Send size={13} /> Envoyée</>}
                              {s === "paid" && <><CheckCircle size={13} /> Payée</>}
                            </button>
                          ))}
                          <div className="border-t border-stone-100 my-1" />
                          <button onClick={async () => { await onRemove(inv.id); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {openMenu && <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />}

        <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title="Détail de la facture">
          {viewInvoice && (() => {
            const owner = owners.find(o => o.id === viewInvoice.owner_id) || viewInvoice.owner;
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{owner?.name}</p>
                    {owner?.company && <p className="text-xs text-stone-500">{owner.company}</p>}
                  </div>
                  <Badge status={viewInvoice.status} />
                </div>
                <div className="text-sm text-stone-600">
                  Période : {fmtDate(viewInvoice.period_start)} &rarr; {fmtDate(viewInvoice.period_end)}
                </div>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-stone-500">Revenu brut</span><span className="text-stone-900 font-medium">{fmt(viewInvoice.total_revenue)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-stone-500">Commission</span><span className="text-red-600">-{fmt(viewInvoice.commission_amount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-stone-500">Frais ménage</span><span className="text-red-600">-{fmt(viewInvoice.cleaning_costs)}</span></div>
                  {viewInvoice.other_costs > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-stone-500">Autres frais</span><span className="text-red-600">-{fmt(viewInvoice.other_costs)}</span></div>
                  )}
                  <div className="border-t border-stone-200 pt-2 mt-2 flex justify-between text-sm font-semibold"><span>Net propriétaire</span><span className="text-stone-900">{fmt(viewInvoice.net_amount)}</span></div>
                </div>
                {owner?.iban && (
                  <div className="text-xs text-stone-500">IBAN : <span className="font-mono">{owner.iban}</span></div>
                )}
                <div className="flex justify-end gap-3 pt-2 flex-wrap">
                  <button onClick={() => handleDownloadPdf(viewInvoice.id)} disabled={downloadingId === viewInvoice.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-50">
                    {downloadingId === viewInvoice.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                  </button>
                  <button onClick={() => handleSendEmail(viewInvoice.id)} disabled={emailingId === viewInvoice.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors disabled:opacity-50">
                    {emailingId === viewInvoice.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Envoyer par email
                  </button>
                  {viewInvoice.status === "draft" && (
                    <button onClick={async () => { await onUpdate(viewInvoice.id, { status: "sent" }); setViewInvoice(prev => prev ? { ...prev, status: "sent" } : null); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                      <Send size={14} /> Marquer envoyée
                    </button>
                  )}
                  {viewInvoice.status === "sent" && (
                    <button onClick={async () => { await onUpdate(viewInvoice.id, { status: "paid" }); setViewInvoice(prev => prev ? { ...prev, status: "paid" } : null); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                      <CheckCircle size={14} /> Marquer payée
                    </button>
                  )}
                  <button onClick={() => setViewInvoice(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Fermer</button>
                </div>
              </div>
            );
          })()}
        </Modal>

        <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Générer les factures">
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Générer les factures brouillon pour <span className="font-semibold">{currentMonth}</span> pour tous les propriétaires ayant des réservations ce mois-ci.
            </p>
            <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600 space-y-1">
              <p>• Revenus calculés à partir des réservations du mois</p>
              <p>• Commission déduite selon le taux de chaque réservation</p>
              <p>• Frais ménage : 80 CHF par intervention</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowGenerate(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Annuler</button>
              <button onClick={handleGenerate} disabled={generating} className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                {generating && <Loader2 size={16} className="animate-spin" />}
                Générer
              </button>
            </div>
          </div>
        </Modal>
      </>)}

      {/* Email result toast */}
      {emailResult && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-3 ${emailResult.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {emailResult.msg}
          <button onClick={() => setEmailResult(null)} className="opacity-80 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {view === "reports" && (
        <div className="space-y-6">
          {/* Generate form */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h3 className="text-sm font-semibold text-stone-900 mb-4">Générer un rapport</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Propriétaire</label>
                <select value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)} className={INPUT_CLASS}>
                  <option value="">Sélectionner...</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.name}{o.company ? ` (${o.company})` : ""}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Année</label>
                <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className={INPUT_CLASS}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Mois</label>
                <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} className={INPUT_CLASS}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString("fr-CH", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleGenerateReport} disabled={!selectedOwnerId || generatingReport}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                {generatingReport && <Loader2 size={16} className="animate-spin" />}
                Générer
              </button>
            </div>
          </div>

          {/* Report detail */}
          {viewReport && (() => {
            const rd = viewReport.data as ReportData;
            const s = rd.summary;
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Rapport — {new Date(s.period_start).toLocaleDateString("fr-CH", { month: "long", year: "numeric" })}
                  </h3>
                  <button onClick={() => setViewReport(null)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Logements", value: s.total_properties, color: "text-stone-900" },
                    { label: "Réservations", value: s.total_bookings, color: "text-blue-600" },
                    { label: "Nuitées", value: s.total_nights, color: "text-violet-600" },
                    { label: "Revenu", value: fmt(s.total_revenue), color: "text-emerald-600" },
                    { label: "Ménages", value: s.total_cleanings, color: "text-amber-600" },
                  ].map((k, i) => (
                    <div key={i} className="bg-white rounded-xl border border-stone-200 p-4">
                      <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100">
                        {["Logement", "Type", "Ville", "Réservations", "Nuitées", "Taux occup.", "Revenu", "Ménages"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {rd.properties.map((p, i) => (
                        <tr key={i} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3 text-sm font-medium text-stone-900">{p.property_name}</td>
                          <td className="px-4 py-3 text-sm text-stone-600 capitalize">{p.property_type}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{p.city} ({p.canton})</td>
                          <td className="px-4 py-3 text-sm text-stone-900">{p.bookings_count}</td>
                          <td className="px-4 py-3 text-sm text-stone-900">{p.nights_booked}</td>
                          <td className="px-4 py-3 text-sm"><span className={`font-medium ${p.occupancy_rate >= 70 ? "text-emerald-600" : p.occupancy_rate >= 40 ? "text-amber-600" : "text-stone-600"}`}>{p.occupancy_rate}%</span></td>
                          <td className="px-4 py-3 text-sm font-medium text-stone-900">{fmt(p.revenue)}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{p.cleanings_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Historical reports list */}
          {selectedOwnerId && reportsHook.data.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200">
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="text-sm font-semibold text-stone-900">Rapports précédents</h3>
              </div>
              <div className="divide-y divide-stone-50">
                {reportsHook.data.slice(0, 10).map(r => {
                  const rd = r.data as ReportData;
                  return (
                    <button key={r.id} onClick={() => setViewReport(r)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-stone-50 transition-colors ${viewReport?.id === r.id ? "bg-amber-50" : ""}`}>
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {(() => {
                            const [y, m] = r.period.split("-");
                            return new Date(Number(y), Number(m) - 1).toLocaleDateString("fr-CH", { month: "long", year: "numeric" });
                          })()}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {rd.summary.total_properties} logements &middot; {rd.summary.total_bookings} réservations &middot; {fmt(rd.summary.total_revenue)}
                        </p>
                      </div>
                      <span className="text-xs text-stone-400">{new Date(r.generated_at).toLocaleDateString("fr-CH")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedOwnerId && reportsHook.data.length === 0 && (
            <div className="text-center py-12 text-stone-400 text-sm">
              Aucun rapport pour ce propriétaire. Générez-en un ci-dessus.
            </div>
          )}

          {!selectedOwnerId && (
            <div className="text-center py-12 text-stone-400 text-sm">
              Sélectionnez un propriétaire pour voir ou générer ses rapports.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PLANNING CALENDAR ───────────────────────────────────────
function PlanningPage({ bookings, properties }: { bookings: Booking[]; properties: Property[] }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredProperties = selectedPropertyId === "all"
    ? properties.filter(p => p.status === "active")
    : properties.filter(p => p.id === selectedPropertyId);

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const monthBookings = bookings.filter(
    b => b.status !== "cancelled" && b.check_out >= monthStart && b.check_in <= monthEnd
  );

  const getPropertyBookings = (propertyId: string) => monthBookings.filter(b => b.property_id === propertyId);

  const getBookingStyle = (booking: Booking) => {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = checkIn < firstDay ? 1 : checkIn.getDate();
    const endDay = checkOut > lastDay ? daysInMonth + 1 : checkOut.getDate();
    const left = ((startDay - 1) / daysInMonth) * 100;
    const width = Math.max(((endDay - startDay) / daysInMonth) * 100, 2);
    return { left: `${left}%`, width: `${width}%` };
  };

  const monthName = new Intl.DateTimeFormat("fr-CH", { month: "long", year: "numeric" }).format(currentDate);
  const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900 capitalize">{monthName}</h2>
          <p className="text-sm text-stone-500 mt-1">{monthBookings.length} réservation{monthBookings.length > 1 ? "s" : ""} ce mois</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">
            Aujourd&apos;hui
          </button>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}
        className="px-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50">
        <option value="all">Tous les logements</option>
        {properties.filter(p => p.status === "active").map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Days header */}
          <div className="border-b border-stone-200 bg-stone-50 flex">
            <div className="w-48 shrink-0 px-4 py-3 border-r border-stone-200">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Logement</span>
            </div>
            <div className="flex-1 flex">
              {days.map(day => {
                const date = new Date(year, month, day);
                const isToday = date.toDateString() === today.toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div key={day} className={`flex-1 min-w-0 text-center px-0.5 py-2.5 border-r border-stone-100 last:border-r-0 ${isToday ? "bg-amber-50" : isWeekend ? "bg-stone-100/50" : ""}`}>
                    <div className={`text-[11px] font-medium ${isToday ? "text-amber-700" : "text-stone-600"}`}>{day}</div>
                    <div className={`text-[9px] ${isToday ? "text-amber-500" : "text-stone-400"}`}>{DAY_LETTERS[date.getDay()]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Property rows */}
          <div className="divide-y divide-stone-100">
            {filteredProperties.length === 0 ? (
              <div className="px-4 py-10 text-center text-stone-400 text-sm">Aucun logement actif</div>
            ) : filteredProperties.map(property => {
              const propBookings = getPropertyBookings(property.id);
              return (
                <div key={property.id} className="flex hover:bg-stone-50/30 transition-colors">
                  <div className="w-48 shrink-0 px-4 py-4 border-r border-stone-100 flex items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{property.name}</p>
                      <p className="text-xs text-stone-500 truncate">{property.city}</p>
                    </div>
                  </div>
                  <div className="flex-1 relative min-h-[52px]">
                    {/* Day grid background */}
                    <div className="absolute inset-0 flex">
                      {days.map(day => {
                        const date = new Date(year, month, day);
                        const isToday = date.toDateString() === today.toDateString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return <div key={day} className={`flex-1 border-r border-stone-100 last:border-r-0 ${isToday ? "bg-amber-50/40" : isWeekend ? "bg-stone-50/40" : ""}`} />;
                      })}
                    </div>
                    {/* Booking bars */}
                    {propBookings.map(booking => {
                      const style = getBookingStyle(booking);
                      const platformColor = booking.is_conflict
                        ? "bg-red-500"
                        : PLATFORM_COLORS[booking.platform] || "bg-stone-500";
                      return (
                        <div key={booking.id} className="absolute top-2.5 h-7 group" style={style}
                          title={`${booking.guest_name} • ${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)}${booking.is_conflict ? " ⚠ CONFLIT" : ""}`}>
                          <div className={`h-full rounded-md px-1.5 flex items-center text-[10px] font-medium text-white shadow-sm ${platformColor} hover:shadow-md hover:brightness-110 transition-all truncate`}>
                            {booking.guest_name}
                            {booking.is_conflict && <span className="ml-1">⚠</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-stone-600 bg-white rounded-xl border border-stone-200 px-4 py-3 flex-wrap">
        <span className="font-medium text-stone-900">Plateformes :</span>
        {[{ label: "Airbnb", color: "bg-rose-500" }, { label: "Booking", color: "bg-blue-600" }, { label: "Direct", color: "bg-violet-600" }, { label: "Autre", color: "bg-slate-500" }].map(p => (
          <div key={p.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${p.color}`} />
            <span>{p.label}</span>
          </div>
        ))}
        <div className="w-px h-4 bg-stone-200" />
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Conflit</span>
        </div>
      </div>
    </div>
  );
}

// ─── PROFITABILITY ───────────────────────────────────────────
function ProfitabilityPage() {
  const { data, loading, fetch: fetchData, fetchHistory } = useProfitability();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<PropertyProfitability[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    fetchData(year, month);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function handleSelectProperty(id: string) {
    if (selectedId === id) { setSelectedId(null); return; }
    setSelectedId(id);
    setLoadingHistory(true);
    const h = await fetchHistory(id, year);
    setHistory(h);
    setLoadingHistory(false);
  }

  function prevMonth() {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function getBadge(netProfit: number): { label: string; color: string } {
    if (netProfit > 0) return { label: "Rentable", color: "bg-emerald-100 text-emerald-800" };
    if (netProfit === 0) return { label: "À optimiser", color: "bg-amber-100 text-amber-800" };
    return { label: "Déficitaire", color: "bg-red-100 text-red-800" };
  }

  // Summary
  const totalGross = data.reduce((s, r) => s + r.gross_revenue, 0);
  const totalComm = data.reduce((s, r) => s + r.commission_amount, 0);
  const totalClean = data.reduce((s, r) => s + r.cleaning_costs, 0);
  const totalNet = data.reduce((s, r) => s + r.net_profit, 0);
  const avgOccupancy = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.occupancy_rate, 0) / data.length * 10) / 10 : 0;
  const rentableCount = data.filter(r => r.net_profit > 0).length;
  const deficitaireCount = data.filter(r => r.net_profit < 0).length;
  const optimiserCount = data.length - rentableCount - deficitaireCount;

  const monthLabel = currentDate.toLocaleDateString("fr-CH", { month: "long", year: "numeric" });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-stone-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Rentabilité</h2>
          <p className="text-sm text-stone-500 mt-1">Performance financière par logement</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-stone-100 text-stone-500"><ChevronLeft size={18} /></button>
          <span className="text-sm font-medium text-stone-900 min-w-[160px] text-center capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-stone-100 text-stone-500"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Revenu brut", value: fmt(totalGross), color: "text-emerald-600" },
          { label: "Commissions", value: `-${fmt(totalComm)}`, color: "text-red-600" },
          { label: "Coût ménages", value: `-${fmt(totalClean)}`, color: "text-amber-600" },
          { label: "Profit net", value: fmt(totalNet), color: totalNet >= 0 ? "text-emerald-600" : "text-red-600" },
          { label: "Occupation moy.", value: `${avgOccupancy}%`, color: "text-blue-600" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Badge distribution */}
      <div className="flex gap-3">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">{rentableCount} rentable{rentableCount > 1 ? "s" : ""}</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{optimiserCount} à optimiser</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">{deficitaireCount} déficitaire{deficitaireCount > 1 ? "s" : ""}</span>
      </div>

      {/* Properties table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              {["Logement", "Ville", "Nuitées", "Occup.", "Revenu brut", "Commission", "Ménages", "Profit net", "Statut"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {data.map(p => {
              const badge = getBadge(p.net_profit);
              return (
                <tr key={p.property_id} onClick={() => handleSelectProperty(p.property_id)}
                  className={`cursor-pointer transition-colors ${selectedId === p.property_id ? "bg-amber-50" : "hover:bg-stone-50/50"}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-stone-900">{p.property_name}</p>
                    <p className="text-xs text-stone-500 capitalize">{p.property_type} &middot; {p.owner_name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">{p.city} ({p.canton})</td>
                  <td className="px-4 py-3 text-sm text-stone-900">{p.nights_booked}/{p.days_in_month}</td>
                  <td className="px-4 py-3 text-sm"><span className={`font-medium ${p.occupancy_rate >= 70 ? "text-emerald-600" : p.occupancy_rate >= 40 ? "text-amber-600" : "text-stone-600"}`}>{p.occupancy_rate}%</span></td>
                  <td className="px-4 py-3 text-sm text-stone-900">{fmt(p.gross_revenue)}</td>
                  <td className="px-4 py-3 text-sm text-red-600">-{fmt(p.commission_amount)}</td>
                  <td className="px-4 py-3 text-sm text-red-600">-{fmt(p.cleaning_costs)}</td>
                  <td className="px-4 py-3 text-sm font-semibold"><span className={p.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}>{fmt(p.net_profit)}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${badge.color}`}>{badge.label}</span></td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-stone-400">Aucune donnée pour cette période</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Monthly chart (expanded property) */}
      {selectedId && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-900">
              Évolution mensuelle — {data.find(d => d.property_id === selectedId)?.property_name || ""}
            </h3>
            <button onClick={() => setSelectedId(null)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
          </div>
          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-stone-400" /></div>
          ) : (
            <div className="flex items-end gap-1" style={{ height: 180 }}>
              {history.map((m, i) => {
                const maxVal = Math.max(...history.map(h => Math.abs(h.net_profit)), 1);
                const heightPct = Math.min((Math.abs(m.net_profit) / maxVal) * 100, 100);
                const isPositive = m.net_profit >= 0;
                const monthName = new Date(year, i).toLocaleDateString("fr-CH", { month: "short" });
                const isCurrent = i + 1 === month;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[9px] font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {m.net_profit !== 0 ? fmt(m.net_profit) : ""}
                    </span>
                    <div className="relative w-full flex items-end justify-center" style={{ height: 120 }}>
                      <div
                        className={`w-3/4 rounded-t transition-all ${isPositive ? "bg-emerald-500" : "bg-red-400"} ${isCurrent ? "ring-2 ring-amber-400" : ""}`}
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] ${isCurrent ? "font-bold text-stone-900" : "text-stone-500"}`}>{monthName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────
function SettingsPage({ currentUser }: { currentUser: Profile }) {
  const profilesHook = useProfiles();
  const companyHook = useCompanySettings();

  const [companyForm, setCompanyForm] = useState({
    name: "", address: "", city: "", postal_code: "", canton: "GE",
    phone: "", email: "", iban: "", tva_number: "",
  });

  const [rates, setRates] = useState({
    commission: "20",
    cleaning: "80",
    deepCleaning: "150",
  });

  const [showInvite, setShowInvite] = useState(false);
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("staff");
  const [saved, setSaved] = useState(false);

  // Notification settings
  const notifHook = useNotificationSettings();
  const [notifPhone, setNotifPhone] = useState("");
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => { profilesHook.fetch(); notifHook.fetchSettings(); notifHook.fetchLogs(10); companyHook.fetchSettings(); }, []);

  useEffect(() => {
    if (notifHook.settings?.whatsapp_phone) {
      setNotifPhone(notifHook.settings.whatsapp_phone);
    }
  }, [notifHook.settings]);

  useEffect(() => {
    if (companyHook.settings) {
      setCompanyForm({
        name: companyHook.settings.name || "",
        address: companyHook.settings.address || "",
        city: companyHook.settings.city || "",
        postal_code: companyHook.settings.postal_code || "",
        canton: companyHook.settings.canton || "GE",
        phone: companyHook.settings.phone || "",
        email: companyHook.settings.email || "",
        iban: companyHook.settings.iban || "",
        tva_number: companyHook.settings.tva_number || "",
      });
    }
  }, [companyHook.settings]);

  async function handleSave() {
    try {
      await companyHook.saveSettings(companyForm);
    } catch { /* table may not exist yet */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const companyFields = [
    { label: "Nom de l'entreprise", key: "name" as const, type: "text" },
    { label: "Adresse", key: "address" as const, type: "text" },
    { label: "Ville", key: "city" as const, type: "text" },
    { label: "Code postal", key: "postal_code" as const, type: "text" },
    { label: "Canton", key: "canton" as const, type: "text" },
    { label: "Téléphone", key: "phone" as const, type: "tel" },
    { label: "Email de contact", key: "email" as const, type: "email" },
    { label: "IBAN", key: "iban" as const, type: "text" },
    { label: "Numéro TVA / IDE", key: "tva_number" as const, type: "text" },
  ];

  const rateFields = [
    { label: "Commission par défaut (%)", key: "commission" as const },
    { label: "Tarif ménage standard (CHF)", key: "cleaning" as const },
    { label: "Tarif ménage approfondi (CHF)", key: "deepCleaning" as const },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Paramètres</h2>
        <p className="text-sm text-stone-500 mt-1">Configuration de votre conciergerie</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Informations entreprise</h3>
        </div>
        <div className="p-6 space-y-5">
          {companyFields.map(f => (
            <div key={f.key} className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-stone-700">{f.label}</label>
              <input
                type={f.type}
                value={companyForm[f.key]}
                onChange={e => setCompanyForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="col-span-2 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Commissions & tarifs</h3>
        </div>
        <div className="p-6 space-y-5">
          {rateFields.map(f => (
            <div key={f.key} className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-stone-700">{f.label}</label>
              <div className="col-span-2">
                <input
                  type="number"
                  value={rates[f.key]}
                  onChange={e => setRates(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h3 className="font-semibold text-stone-900">Équipe</h3>
          <button onClick={() => setShowInvite(true)} className="text-sm text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1">
            <Plus size={14} /> Inviter
          </button>
        </div>
        <div className="divide-y divide-stone-100">
          {profilesHook.data.map((m) => (
            <div key={m.id} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                  {(m.full_name || m.email).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">{m.full_name || m.email}</p>
                  <p className="text-xs text-stone-500">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${m.role === "admin" ? "bg-violet-100 text-violet-700" : m.role === "staff" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"} capitalize`}>
                  {m.role}
                </span>
                {m.id !== currentUser.id && (
                  <button onClick={() => profilesHook.remove(m.id)}
                    className="text-stone-300 hover:text-red-500 transition-colors" title="Retirer">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications WhatsApp */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-stone-900">Notifications WhatsApp</h3>
            <p className="text-xs text-stone-500 mt-0.5">Alertes automatiques sur vos événements métier</p>
          </div>
          <button onClick={async () => {
            try { await notifHook.saveSettings({ is_active: !notifHook.settings?.is_active }); } catch { /* ignore */ }
          }} className={`relative w-11 h-6 rounded-full transition-colors ${notifHook.settings?.is_active ? "bg-emerald-500" : "bg-stone-300"}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifHook.settings?.is_active ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-sm font-medium text-stone-700">Numéro WhatsApp</label>
            <div className="col-span-2 flex gap-2">
              <input type="tel" placeholder="+41 79 123 45 67"
                value={notifPhone}
                onChange={e => setNotifPhone(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400" />
              <button onClick={async () => {
                setNotifSaving(true);
                try { await notifHook.saveSettings({ whatsapp_phone: notifPhone }); } catch { /* ignore */ }
                setNotifSaving(false);
              }} disabled={notifSaving}
                className="px-3 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors disabled:opacity-50">
                {notifSaving ? <Loader2 size={14} className="animate-spin" /> : "Enregistrer"}
              </button>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Événements</p>
            {[
              { key: "event_overbooking" as const, label: "Conflit de réservation (overbooking)" },
              { key: "event_booking_created" as const, label: "Nouvelle réservation créée" },
              { key: "event_booking_cancelled" as const, label: "Réservation annulée" },
              { key: "event_cleaning_not_validated" as const, label: "Ménage non validé après départ" },
              { key: "event_incident_reported" as const, label: "Incident signalé" },
              { key: "event_checkin_no_cleaning" as const, label: "Check-in proche sans ménage validé" },
            ].map(evt => (
              <div key={evt.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-stone-700">{evt.label}</span>
                <button onClick={async () => {
                  try { await notifHook.saveSettings({ [evt.key]: !notifHook.settings?.[evt.key] }); } catch { /* ignore */ }
                }} className={`relative w-9 h-5 rounded-full transition-colors ${notifHook.settings?.[evt.key] ? "bg-emerald-500" : "bg-stone-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notifHook.settings?.[evt.key] ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Recent logs */}
          {notifHook.logs.length > 0 && (
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Historique récent</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifHook.logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${log.status === "sent" ? "bg-emerald-500" : log.status === "failed" ? "bg-red-500" : "bg-amber-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-stone-700 truncate">{log.message}</p>
                      <p className="text-xs text-stone-400">{new Date(log.created_at).toLocaleString("fr-CH")} &middot; {log.status === "sent" ? "Envoyé" : log.status === "failed" ? "Échoué" : "En attente"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end items-center gap-4">
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Modifications enregistrées</span>
        )}
        <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
          Enregistrer les modifications
        </button>
      </div>

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Inviter un membre">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!invEmail.trim()) return;
          try {
            const res = await fetch("/api/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: invEmail, full_name: invName || null, role: invRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur lors de l'invitation");
            setShowInvite(false);
            setInvName(""); setInvEmail(""); setInvRole("staff");
            profilesHook.fetch();
          } catch (err) {
            alert(err instanceof Error ? err.message : "Erreur inconnue");
          }
        }} className="space-y-4">
          <FormField label="Nom complet">
            <input type="text" value={invName} onChange={e => setInvName(e.target.value)} className={INPUT_CLASS} placeholder="Optionnel" />
          </FormField>
          <FormField label="Email">
            <input type="email" required value={invEmail} onChange={e => setInvEmail(e.target.value)} className={INPUT_CLASS} placeholder="email@example.ch" />
          </FormField>
          <FormField label="Rôle">
            <select value={invRole} onChange={e => setInvRole(e.target.value)} className={INPUT_CLASS}>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="owner">Propriétaire</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">Annuler</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">Inviter</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
