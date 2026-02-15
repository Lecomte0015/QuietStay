"use client";

import { useState, useEffect } from "react";
import {
  Save, Eye, Copy, Check, Plus, Trash2, Loader2, Globe, GlobeLock,
} from "lucide-react";
import { useGuidebooks } from "@/hooks/useGuidebooks";
import type { Guidebook, Property } from "@/types";

const INPUT_CLASS = "w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[80px] resize-y`;

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-stone-500">{label}</label>
      {children}
    </div>
  );
}

export default function GuidebookEditor({ property, onBack }: {
  property: Property;
  onBack: () => void;
}) {
  const { fetchByProperty, upsert, togglePublish } = useGuidebooks();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guidebook, setGuidebook] = useState<Guidebook | null>(null);

  // Form state
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [checkInTime, setCheckInTime] = useState("15:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [accessInstructions, setAccessInstructions] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [parkingInfo, setParkingInfo] = useState("");
  const [transportInfo, setTransportInfo] = useState("");
  const [restaurants, setRestaurants] = useState("");
  const [activities, setActivities] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState("");
  const [customSections, setCustomSections] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const gb = await fetchByProperty(property.id);
      if (gb) {
        setGuidebook(gb);
        setWelcomeMessage(gb.welcome_message || "");
        setWifiName(gb.wifi_name || "");
        setWifiPassword(gb.wifi_password || "");
        setCheckInTime(gb.check_in_time || "15:00");
        setCheckOutTime(gb.check_out_time || "11:00");
        setAccessInstructions(gb.access_instructions || "");
        setHouseRules(gb.house_rules || "");
        setParkingInfo(gb.parking_info || "");
        setTransportInfo(gb.transport_info || "");
        setRestaurants(gb.restaurants || "");
        setActivities(gb.activities || "");
        setEmergencyContacts(gb.emergency_contacts || "");
        setCustomSections(gb.custom_sections || []);
      }
      setLoading(false);
    })();
  }, [property.id, fetchByProperty]);

  async function handleSave() {
    setSaving(true);
    try {
      await upsert({
        property_id: property.id,
        welcome_message: welcomeMessage || null,
        wifi_name: wifiName || null,
        wifi_password: wifiPassword || null,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        access_instructions: accessInstructions || null,
        house_rules: houseRules || null,
        parking_info: parkingInfo || null,
        transport_info: transportInfo || null,
        restaurants: restaurants || null,
        activities: activities || null,
        emergency_contacts: emergencyContacts || null,
        custom_sections: customSections,
      });
      const gb = await fetchByProperty(property.id);
      if (gb) setGuidebook(gb);
    } catch (err) {
      console.error("Save guidebook error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    if (!guidebook) return;
    try {
      await togglePublish(guidebook.id, !guidebook.is_published);
      const gb = await fetchByProperty(property.id);
      if (gb) setGuidebook(gb);
    } catch (err) {
      console.error("Toggle publish error:", err);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/g/${property.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-900 mb-1">&larr; Retour aux guidebooks</button>
          <h2 className="font-serif text-2xl text-stone-900">{property.name}</h2>
          <p className="text-sm text-stone-500 mt-0.5">{property.address}, {property.city}</p>
        </div>
        <div className="flex items-center gap-2">
          {guidebook && (
            <>
              <button onClick={handleTogglePublish}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${guidebook.is_published ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                {guidebook.is_published ? <Globe size={16} /> : <GlobeLock size={16} />}
                {guidebook.is_published ? "Publié" : "Brouillon"}
              </button>
              <button onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copied ? "Copié !" : "Copier le lien"}
              </button>
            </>
          )}
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-lg shadow-stone-900/10">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer
          </button>
        </div>
      </div>

      {/* Preview link */}
      {guidebook?.is_published && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Eye size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            Page publique : <a href={`/g/${property.id}`} target="_blank" rel="noopener noreferrer" className="underline font-medium">/g/{property.id.slice(0, 8)}...</a>
          </p>
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Accueil</h3>
            <FormField label="Message de bienvenue">
              <textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} className={TEXTAREA_CLASS} placeholder="Bienvenue dans notre logement..." />
            </FormField>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">WiFi</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nom du réseau">
                <input value={wifiName} onChange={e => setWifiName(e.target.value)} className={INPUT_CLASS} placeholder="MonWiFi" />
              </FormField>
              <FormField label="Mot de passe">
                <input value={wifiPassword} onChange={e => setWifiPassword(e.target.value)} className={INPUT_CLASS} placeholder="••••••••" />
              </FormField>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Horaires</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Check-in">
                <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} className={INPUT_CLASS} />
              </FormField>
              <FormField label="Check-out">
                <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} className={INPUT_CLASS} />
              </FormField>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Accès</h3>
            <FormField label="Instructions d'accès">
              <textarea value={accessInstructions} onChange={e => setAccessInstructions(e.target.value)} className={TEXTAREA_CLASS} placeholder="Code de la porte, boîte à clés..." />
            </FormField>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Règlement</h3>
            <FormField label="Règlement intérieur">
              <textarea value={houseRules} onChange={e => setHouseRules(e.target.value)} className={TEXTAREA_CLASS} placeholder="Pas de bruit après 22h..." />
            </FormField>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Parking</h3>
            <FormField label="Informations parking">
              <textarea value={parkingInfo} onChange={e => setParkingInfo(e.target.value)} className={TEXTAREA_CLASS} placeholder="Place de parking n°12..." />
            </FormField>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Transports</h3>
            <FormField label="Transports à proximité">
              <textarea value={transportInfo} onChange={e => setTransportInfo(e.target.value)} className={TEXTAREA_CLASS} placeholder="Arrêt de bus à 2 min..." />
            </FormField>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Recommandations</h3>
            <FormField label="Restaurants">
              <textarea value={restaurants} onChange={e => setRestaurants(e.target.value)} className={TEXTAREA_CLASS} placeholder="Le Petit Café — 5 min à pied..." />
            </FormField>
            <FormField label="Activités">
              <textarea value={activities} onChange={e => setActivities(e.target.value)} className={TEXTAREA_CLASS} placeholder="Randonnée au Salève..." />
            </FormField>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Urgences</h3>
            <FormField label="Contacts d'urgence">
              <textarea value={emergencyContacts} onChange={e => setEmergencyContacts(e.target.value)} className={TEXTAREA_CLASS} placeholder="Police : 117&#10;Pompiers : 118&#10;REGA : 1414" />
            </FormField>
          </div>

          {/* Custom sections */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">Sections personnalisées</h3>
              <button onClick={() => setCustomSections([...customSections, { title: "", content: "" }])}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
                <Plus size={12} /> Ajouter
              </button>
            </div>
            {customSections.map((section, i) => (
              <div key={i} className="space-y-2 p-3 bg-stone-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <input
                    value={section.title}
                    onChange={e => {
                      const next = [...customSections];
                      next[i] = { ...next[i], title: e.target.value };
                      setCustomSections(next);
                    }}
                    className={INPUT_CLASS}
                    placeholder="Titre de la section"
                  />
                  <button onClick={() => setCustomSections(customSections.filter((_, j) => j !== i))}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={section.content}
                  onChange={e => {
                    const next = [...customSections];
                    next[i] = { ...next[i], content: e.target.value };
                    setCustomSections(next);
                  }}
                  className={TEXTAREA_CLASS}
                  placeholder="Contenu..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
