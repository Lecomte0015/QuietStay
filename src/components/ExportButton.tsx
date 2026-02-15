"use client";

import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown } from "lucide-react";
import { generateJournalComptable, generateReleveProprietaire, generateExportReservations } from "@/lib/export-csv";
import { downloadFile } from "@/lib/download-file";
import type { Invoice, Booking, Owner, Property } from "@/types";

interface ExportButtonProps {
  invoices: Invoice[];
  bookings: Booking[];
  owners: Owner[];
  properties: Property[];
}

export default function ExportButton({ invoices, bookings, owners, properties }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function handleExport(type: "journal" | "releve" | "reservations") {
    setOpen(false);
    switch (type) {
      case "journal": {
        const csv = generateJournalComptable(invoices, owners);
        downloadFile(csv, `journal-comptable-${dateStr}.csv`);
        break;
      }
      case "releve": {
        const csv = generateReleveProprietaire(invoices, owners);
        downloadFile(csv, `releve-proprietaires-${dateStr}.csv`);
        break;
      }
      case "reservations": {
        const csv = generateExportReservations(bookings, properties);
        downloadFile(csv, `reservations-${dateStr}.csv`);
        break;
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-stone-700 text-sm font-medium border border-stone-200 hover:bg-stone-50 transition-colors"
      >
        <Download size={16} /> Exporter <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-stone-200 shadow-xl z-50 overflow-hidden">
          <button onClick={() => handleExport("journal")} className="w-full text-left px-4 py-3 text-sm hover:bg-stone-50 transition-colors border-b border-stone-100">
            <p className="font-medium text-stone-900">Journal comptable</p>
            <p className="text-xs text-stone-500 mt-0.5">Écritures Bexio (CSV)</p>
          </button>
          <button onClick={() => handleExport("releve")} className="w-full text-left px-4 py-3 text-sm hover:bg-stone-50 transition-colors border-b border-stone-100">
            <p className="font-medium text-stone-900">Relevé propriétaires</p>
            <p className="text-xs text-stone-500 mt-0.5">Synthèse par propriétaire (CSV)</p>
          </button>
          <button onClick={() => handleExport("reservations")} className="w-full text-left px-4 py-3 text-sm hover:bg-stone-50 transition-colors">
            <p className="font-medium text-stone-900">Export réservations</p>
            <p className="text-xs text-stone-500 mt-0.5">Toutes les réservations (CSV)</p>
          </button>
        </div>
      )}
    </div>
  );
}
