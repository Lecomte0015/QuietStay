"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);

const PLATFORM_COLORS: Record<string, string> = {
  "Airbnb": "#e11d48",
  "Booking.com": "#2563eb",
  "Direct": "#7c3aed",
  "Autre": "#78716c",
};

const PIE_COLORS = ["#e11d48", "#2563eb", "#7c3aed", "#78716c"];

export default function AnalyticsPage() {
  const { data, loading, fetch } = useAnalytics();
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch(year);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  const avgRevenuePerBooking = data.totalBookings > 0
    ? Math.round(data.totalRevenue / data.totalBookings)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Analytique</h2>
          <p className="text-sm text-stone-500 mt-1">Performance annuelle et tendances</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl hover:bg-stone-100 text-stone-500">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-stone-900 min-w-[80px] text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-2 rounded-xl hover:bg-stone-100 text-stone-500">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Revenu total", value: fmt(data.totalRevenue), color: "text-emerald-600" },
          { label: "Réservations", value: String(data.totalBookings), color: "text-blue-600" },
          { label: "Occupation moy.", value: `${data.avgOccupancy}%`, color: "text-amber-600" },
          { label: "Revenu moy./rés.", value: fmt(avgRevenuePerBooking), color: "text-violet-600" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-900 mb-4">Tendance des revenus</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a8a29e" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(value) => [fmt(Number(value || 0)), "Revenu"]} />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Rate Trend */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-900 mb-4">Taux d&apos;occupation</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.occupancyByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a8a29e" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(value) => [`${Number(value || 0)}%`, "Occupation"]} />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Property */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-900 mb-4">Revenu par propriété</h3>
          <ResponsiveContainer width="100%" height={Math.max(280, data.revenueByProperty.length * 40)}>
            <BarChart data={data.revenueByProperty} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#a8a29e" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#a8a29e" width={120} />
              <Tooltip formatter={(value) => [fmt(Number(value || 0)), "Revenu"]} />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Platform */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-900 mb-4">Revenu par plateforme</h3>
          {data.revenueByPlatform.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.revenueByPlatform}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {data.revenueByPlatform.map((entry, index) => (
                    <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [fmt(Number(value || 0)), "Revenu"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-stone-400">Aucune donnée</div>
          )}
        </div>

        {/* Bookings Count Trend */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-stone-900 mb-4">Réservations par mois</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.bookingsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a8a29e" allowDecimals={false} />
              <Tooltip formatter={(value) => [Number(value || 0), "Réservations"]} />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
