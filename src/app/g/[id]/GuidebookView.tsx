"use client";

import { useState } from "react";
import {
  Wifi, Clock, KeyRound, ScrollText, Car, Train,
  UtensilsCrossed, MapPin, Phone, Copy, Check, BookOpen,
} from "lucide-react";
import type { Property, Guidebook } from "@/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

function Section({ icon: Icon, title, children }: {
  icon: typeof Wifi;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-amber-600" />
        </div>
        <h2 className="font-semibold text-stone-900">{title}</h2>
      </div>
      <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{children}</div>
    </div>
  );
}

export default function GuidebookView({ property, guidebook }: {
  property: Property;
  guidebook: Guidebook;
}) {
  const PROPERTY_ICONS: Record<string, string> = {
    apartment: "\u{1F3E2}", house: "\u{1F3E0}", studio: "\u{1F3D9}\u{FE0F}",
    chalet: "\u{1F3D4}\u{FE0F}", villa: "\u{1F3DB}\u{FE0F}",
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white">
        <div className="max-w-2xl mx-auto px-5 py-10 sm:py-14">
          <div className="flex items-center gap-2 text-amber-400 text-sm mb-3">
            <BookOpen size={16} />
            <span>Guide voyageur</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl mb-2">
            {PROPERTY_ICONS[property.property_type] || ""} {property.name}
          </h1>
          <p className="text-stone-400 flex items-center gap-1.5">
            <MapPin size={14} />
            {property.address}, {property.postal_code} {property.city}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
        {/* Welcome */}
        {guidebook.welcome_message && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6">
            <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-line">
              {guidebook.welcome_message}
            </p>
          </div>
        )}

        {/* WiFi */}
        {guidebook.wifi_name && (
          <Section icon={Wifi} title="WiFi">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-stone-400 text-xs">Réseau :</span>
                  <p className="font-medium text-stone-900">{guidebook.wifi_name}</p>
                </div>
                <CopyButton text={guidebook.wifi_name} />
              </div>
              {guidebook.wifi_password && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-stone-400 text-xs">Mot de passe :</span>
                    <p className="font-mono font-medium text-stone-900">{guidebook.wifi_password}</p>
                  </div>
                  <CopyButton text={guidebook.wifi_password} />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Check-in / Check-out */}
        <Section icon={Clock} title="Horaires">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-stone-400 text-xs">Arrivée</span>
              <p className="text-lg font-semibold text-stone-900">{guidebook.check_in_time}</p>
            </div>
            <div>
              <span className="text-stone-400 text-xs">Départ</span>
              <p className="text-lg font-semibold text-stone-900">{guidebook.check_out_time}</p>
            </div>
          </div>
        </Section>

        {/* Access */}
        {guidebook.access_instructions && (
          <Section icon={KeyRound} title="Accès au logement">
            {guidebook.access_instructions}
          </Section>
        )}

        {/* House rules */}
        {guidebook.house_rules && (
          <Section icon={ScrollText} title="Règlement intérieur">
            {guidebook.house_rules}
          </Section>
        )}

        {/* Parking */}
        {guidebook.parking_info && (
          <Section icon={Car} title="Parking">
            {guidebook.parking_info}
          </Section>
        )}

        {/* Transport */}
        {guidebook.transport_info && (
          <Section icon={Train} title="Transports">
            {guidebook.transport_info}
          </Section>
        )}

        {/* Restaurants */}
        {guidebook.restaurants && (
          <Section icon={UtensilsCrossed} title="Restaurants recommandés">
            {guidebook.restaurants}
          </Section>
        )}

        {/* Activities */}
        {guidebook.activities && (
          <Section icon={MapPin} title="Activités & découvertes">
            {guidebook.activities}
          </Section>
        )}

        {/* Emergency contacts */}
        {guidebook.emergency_contacts && (
          <Section icon={Phone} title="Contacts urgence">
            {guidebook.emergency_contacts}
          </Section>
        )}

        {/* Custom sections */}
        {guidebook.custom_sections?.map((section, i) => (
          <Section key={i} icon={BookOpen} title={section.title}>
            {section.content}
          </Section>
        ))}

        {/* Footer */}
        <div className="text-center py-8 text-xs text-stone-400">
          Powered by QuietStay
        </div>
      </div>
    </div>
  );
}
