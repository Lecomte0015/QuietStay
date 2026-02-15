"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home, Building2, CalendarDays, FileText, TrendingUp,
  LogOut, Loader2, Menu, X, Download, ChevronLeft, ChevronRight,
  MapPin, BedDouble, Users as UsersIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  useProperties, useBookings, useInvoices, useReports,
} from "@/hooks/useSupabase";
import type { Profile, Property, Booking, Invoice, Report, ReportData } from "@/types";

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-CH");
const nights = (a: string, b: string) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 864e5);

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-emerald-100 text-emerald-800", checked_out: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-800", draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-800", paid: "bg-emerald-100 text-emerald-800",
  active: "bg-emerald-100 text-emerald-800", inactive: "bg-slate-100 text-slate-600",
  maintenance: "bg-amber-100 text-amber-800",
};

const STATUS_FR: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", checked_in: "En cours",
  checked_out: "Terminée", cancelled: "Annulée",
  draft: "Brouillon", sent: "Envoyée", paid: "Payée",
  active: "Actif", inactive: "Inactif", maintenance: "Maintenance",
};

const PLATFORM_FR: Record<string, string> = {
  airbnb: "Airbnb", booking: "Booking.com", direct: "Direct", other: "Autre",
};

const PROPERTY_ICONS: Record<string, string> = {
  apartment: "🏢", house: "🏠", studio: "🏛️", chalet: "🏔️", villa: "🏰",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_COLORS[status] || "bg-stone-100 text-stone-600"}`}>
      {STATUS_FR[status] || status}
    </span>
  );
}

// ─── NAV ─────────────────────────────────────────────────────
const OWNER_NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: Home },
  { id: "properties", label: "Mes Logements", icon: Building2 },
  { id: "bookings", label: "Mes Réservations", icon: CalendarDays },
  { id: "invoices", label: "Mes Factures", icon: FileText },
  { id: "reports", label: "Mes Rapports", icon: TrendingUp },
];

// ─── OWNER DASHBOARD ────────────────────────────────────────
function OwnerDashboardPage({ properties, bookings, invoices }: {
  properties: Property[]; bookings: Booking[]; invoices: Invoice[];
}) {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const activeBookings = bookings.filter(b => ["confirmed", "checked_in"].includes(b.status));
  const monthRevenue = bookings
    .filter(b => b.check_in >= monthStart && b.status !== "cancelled")
    .reduce((s, b) => s + (b.total_amount || 0), 0);
  const occupiedToday = bookings.filter(
    b => b.check_in <= today && b.check_out > today && !["cancelled", "checked_out"].includes(b.status)
  ).length;
  const activeProps = properties.filter(p => p.status === "active").length;
  const occupancyRate = activeProps > 0 ? Math.round((occupiedToday / activeProps) * 100) : 0;

  // Upcoming movements (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];
  const upcomingArrivals = bookings
    .filter(b => b.check_in >= today && b.check_in <= nextWeekStr && b.status !== "cancelled")
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .slice(0, 5);
  const upcomingDepartures = bookings
    .filter(b => b.check_out >= today && b.check_out <= nextWeekStr && b.status !== "cancelled")
    .sort((a, b) => a.check_out.localeCompare(b.check_out))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Tableau de bord</h2>
        <p className="text-sm text-stone-500 mt-1">Vue d&apos;ensemble de vos logements</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Mes logements", value: String(activeProps), color: "text-blue-600" },
          { label: "Revenu du mois", value: fmt(monthRevenue), color: "text-emerald-600" },
          { label: "Réservations actives", value: String(activeBookings.length), color: "text-amber-600" },
          { label: "Taux d'occupation", value: `${occupancyRate}%`, color: "text-violet-600" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming arrivals */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Prochaines arrivées</h3>
          {upcomingArrivals.length === 0 ? (
            <p className="text-sm text-stone-400">Aucune arrivée prévue</p>
          ) : (
            <div className="space-y-2">
              {upcomingArrivals.map(b => {
                const prop = properties.find(p => p.id === b.property_id);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{b.guest_name}</p>
                      <p className="text-xs text-stone-500">{prop?.name} &middot; {nights(b.check_in, b.check_out)} nuits</p>
                    </div>
                    <p className="text-xs text-stone-500">{fmtDate(b.check_in)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming departures */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Prochains départs</h3>
          {upcomingDepartures.length === 0 ? (
            <p className="text-sm text-stone-400">Aucun départ prévu</p>
          ) : (
            <div className="space-y-2">
              {upcomingDepartures.map(b => {
                const prop = properties.find(p => p.id === b.property_id);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{b.guest_name}</p>
                      <p className="text-xs text-stone-500">{prop?.name}</p>
                    </div>
                    <p className="text-xs text-stone-500">{fmtDate(b.check_out)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Dernières factures</h3>
          <div className="space-y-2">
            {invoices.slice(0, 3).map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-stone-900">{fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}</p>
                  <p className="text-xs text-stone-500">Net: {fmt(inv.net_amount)}</p>
                </div>
                <Badge status={inv.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OWNER PROPERTIES ───────────────────────────────────────
function OwnerPropertiesPage({ properties, bookings }: { properties: Property[]; bookings: Booking[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Mes Logements</h2>
        <p className="text-sm text-stone-500 mt-1">{properties.length} logement{properties.length > 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map(p => {
          const propBookings = bookings.filter(b => b.property_id === p.id && b.status !== "cancelled");
          const activeBooking = propBookings.find(b => b.check_in <= today && b.check_out > today);
          const isSelected = selected === p.id;

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <button onClick={() => setSelected(isSelected ? null : p.id)} className="w-full text-left p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{PROPERTY_ICONS[p.property_type] || "🏠"}</span>
                      <h3 className="text-sm font-semibold text-stone-900">{p.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                      <MapPin size={12} />
                      <span>{p.address}, {p.city} ({p.canton})</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                      <span className="flex items-center gap-1"><BedDouble size={12} /> {p.bedrooms} ch.</span>
                      <span className="flex items-center gap-1"><UsersIcon size={12} /> {p.max_guests} pers.</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge status={p.status} />
                    {activeBooking && (
                      <p className="text-[10px] text-emerald-600 mt-1">Occupé</p>
                    )}
                  </div>
                </div>
              </button>

              {isSelected && (
                <div className="border-t border-stone-100 p-5 bg-stone-50/50">
                  <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Réservations récentes</h4>
                  {propBookings.length === 0 ? (
                    <p className="text-sm text-stone-400">Aucune réservation</p>
                  ) : (
                    <div className="space-y-2">
                      {propBookings.slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center justify-between py-1.5">
                          <div>
                            <p className="text-sm text-stone-900">{b.guest_name}</p>
                            <p className="text-xs text-stone-500">{fmtDate(b.check_in)} → {fmtDate(b.check_out)} &middot; {nights(b.check_in, b.check_out)} nuits</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-stone-900">{b.total_amount ? fmt(b.total_amount) : "—"}</p>
                            <Badge status={b.status} />
                          </div>
                        </div>
                      ))}
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

// ─── OWNER BOOKINGS ─────────────────────────────────────────
function OwnerBookingsPage({ bookings, properties }: { bookings: Booking[]; properties: Property[] }) {
  const sorted = [...bookings].sort((a, b) => b.check_in.localeCompare(a.check_in));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Mes Réservations</h2>
        <p className="text-sm text-stone-500 mt-1">{bookings.length} réservation{bookings.length > 1 ? "s" : ""}</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                {["Logement", "Plateforme", "Guest", "Check-in", "Check-out", "Nuits", "Montant", "Statut"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {sorted.map(b => {
                const prop = properties.find(p => p.id === b.property_id);
                return (
                  <tr key={b.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">{prop?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">{PLATFORM_FR[b.platform] || b.platform}</td>
                    <td className="px-4 py-3 text-sm text-stone-900">{b.guest_name}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">{fmtDate(b.check_in)}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">{fmtDate(b.check_out)}</td>
                    <td className="px-4 py-3 text-sm text-stone-900">{nights(b.check_in, b.check_out)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">{b.total_amount ? fmt(b.total_amount) : "—"}</td>
                    <td className="px-4 py-3"><Badge status={b.status} /></td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-stone-400">Aucune réservation</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── OWNER INVOICES ─────────────────────────────────────────
function OwnerInvoicesPage({ invoices }: { invoices: Invoice[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const sorted = [...invoices].sort((a, b) => b.period_start.localeCompare(a.period_start));

  async function handleDownloadPdf(id: string) {
    setDownloadingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ invoice_id: id }),
      });
      if (!res.ok) throw new Error("Erreur PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* handled silently */ }
    setDownloadingId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Mes Factures</h2>
        <p className="text-sm text-stone-500 mt-1">{invoices.length} facture{invoices.length > 1 ? "s" : ""}</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                {["Période", "Revenu brut", "Commission", "Ménage", "Net", "Statut", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {sorted.map(inv => (
                <tr key={inv.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 text-sm text-stone-900">{fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}</td>
                  <td className="px-4 py-3 text-sm text-stone-900">{fmt(inv.total_revenue)}</td>
                  <td className="px-4 py-3 text-sm text-red-600">-{fmt(inv.commission_amount)}</td>
                  <td className="px-4 py-3 text-sm text-red-600">-{fmt(inv.cleaning_costs)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-stone-900">{fmt(inv.net_amount)}</td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownloadPdf(inv.id)}
                      disabled={downloadingId === inv.id}
                      className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors disabled:opacity-50"
                      title="Télécharger PDF"
                    >
                      {downloadingId === inv.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-400">Aucune facture</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── OWNER REPORTS ──────────────────────────────────────────
function OwnerReportsPage({ reports, ownerId, onFetch }: {
  reports: Report[]; ownerId: string | null; onFetch: (id: string) => void;
}) {
  const [viewReport, setViewReport] = useState<Report | null>(null);

  useEffect(() => {
    if (ownerId) onFetch(ownerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  if (!ownerId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Compte propriétaire non lié</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Mes Rapports</h2>
        <p className="text-sm text-stone-500 mt-1">{reports.length} rapport{reports.length > 1 ? "s" : ""} disponible{reports.length > 1 ? "s" : ""}</p>
      </div>

      {viewReport ? (
        <div className="space-y-4">
          <button onClick={() => setViewReport(null)} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700">
            <ChevronLeft size={16} /> Retour aux rapports
          </button>
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h3 className="font-serif text-lg text-stone-900 mb-1">Rapport {viewReport.period}</h3>
            <p className="text-xs text-stone-500 mb-6">Généré le {fmtDate(viewReport.generated_at)}</p>

            {viewReport.data && viewReport.data.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Propriétés", value: String(viewReport.data.summary.total_properties) },
                  { label: "Réservations", value: String(viewReport.data.summary.total_bookings) },
                  { label: "Nuitées", value: String(viewReport.data.summary.total_nights) },
                  { label: "Revenu total", value: fmt(viewReport.data.summary.total_revenue) },
                ].map((k, i) => (
                  <div key={i} className="bg-stone-50 rounded-xl p-3">
                    <p className="text-lg font-semibold text-stone-900">{k.value}</p>
                    <p className="text-xs text-stone-500">{k.label}</p>
                  </div>
                ))}
              </div>
            )}

            {viewReport.data && viewReport.data.properties && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100">
                      {["Logement", "Ville", "Réservations", "Nuitées", "Revenu", "Occupation"].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-stone-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {viewReport.data.properties.map((pr, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-sm font-medium text-stone-900">{pr.property_name}</td>
                        <td className="px-3 py-2 text-sm text-stone-600">{pr.city}</td>
                        <td className="px-3 py-2 text-sm text-stone-900">{pr.bookings_count}</td>
                        <td className="px-3 py-2 text-sm text-stone-900">{pr.nights_booked}</td>
                        <td className="px-3 py-2 text-sm font-medium text-stone-900">{fmt(pr.revenue)}</td>
                        <td className="px-3 py-2 text-sm text-stone-600">{pr.occupancy_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="divide-y divide-stone-50">
            {reports.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-stone-400">Aucun rapport disponible</p>
            ) : (
              reports.map(r => (
                <button key={r.id} onClick={() => setViewReport(r)} className="w-full text-left px-5 py-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">Rapport {r.period}</p>
                    <p className="text-xs text-stone-500">Généré le {fmtDate(r.generated_at)}</p>
                  </div>
                  <ChevronRight size={16} className="text-stone-400" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN OWNER PORTAL ──────────────────────────────────────
export default function OwnerPortal({ user, onSignOut }: { user: Profile; onSignOut: () => void }) {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const propertiesHook = useProperties();
  const bookingsHook = useBookings();
  const invoicesHook = useInvoices();
  const reportsHook = useReports();

  // Resolve owner_id from user_id
  useEffect(() => {
    supabase.from("owners").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setOwnerId(data.id);
      });
  }, [user.id]);

  // Fetch data (RLS will filter to owner's data only)
  useEffect(() => {
    propertiesHook.fetchWithOwners();
    bookingsHook.fetchWithProperty();
    invoicesHook.fetchWithOwners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReports = useCallback((id: string) => {
    reportsHook.fetchByOwner(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <OwnerDashboardPage properties={propertiesHook.data} bookings={bookingsHook.data} invoices={invoicesHook.data} />;
      case "properties":
        return <OwnerPropertiesPage properties={propertiesHook.data} bookings={bookingsHook.data} />;
      case "bookings":
        return <OwnerBookingsPage bookings={bookingsHook.data} properties={propertiesHook.data} />;
      case "invoices":
        return <OwnerInvoicesPage invoices={invoicesHook.data} />;
      case "reports":
        return <OwnerReportsPage reports={reportsHook.data} ownerId={ownerId} onFetch={fetchReports} />;
      default:
        return <OwnerDashboardPage properties={propertiesHook.data} bookings={bookingsHook.data} invoices={invoicesHook.data} />;
    }
  };

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
                <p className="text-[10px] text-amber-400 tracking-widest uppercase">Portail Propriétaire</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">QS</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {OWNER_NAV.map(({ id, label, icon: Icon }) => (
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
                <p className="text-xs text-stone-500 capitalize">Propriétaire</p>
              </div>
              <button onClick={onSignOut} className="text-stone-500 hover:text-stone-300" title="Déconnexion">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={onSignOut} className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white hover:bg-stone-600 transition-colors" title="Déconnexion">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-2 rounded-lg hover:bg-stone-100">
              {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 rounded-lg hover:bg-stone-100 text-stone-400">
              <Menu size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Lecture seule</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>

      {/* Mobile overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
      )}
    </div>
  );
}
