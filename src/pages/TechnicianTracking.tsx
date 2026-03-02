// ============================================
// FILE: src/pages/TechnicianTracking.tsx
// Full-featured technician tracking page
// ============================================
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  MapPin,
  RefreshCw,
  Clock,
  Navigation,
  Wifi,
  WifiOff,
  Signal,
  Activity,
  Phone,
  MessageCircle,
  Crosshair,
  ChevronDown,
  User,
  MapPinned,
  Route,
  Filter,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default icons ────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ── Types ────────────────────────────────────────────────────────────────────
interface TechnicianLocation {
  id: string;
  technician_id: string;
  service_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  is_active: boolean;
  technician_name: string;
  technician_phone: string | null;
  technician_status: string;
  service_title: string | null;
  service_address: string | null;
  customer_name: string | null;
  invoice_number: string | null;
}

interface RouteHistory {
  technician_id: string;
  points: [number, number][];
}

// ── Constants ────────────────────────────────────────────────────────────────
const COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#db2777",
];

// ── Icon factory ─────────────────────────────────────────────────────────────
const createMarkerIcon = (
  color: string,
  initials: string,
  isSelected: boolean,
) => {
  const size = isSelected ? 48 : 40;
  const ring = isSelected
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="none" stroke="${color}" stroke-width="2" opacity="0.3"/>`
    : "";
  const shadow = isSelected
    ? `drop-shadow(0 4px 8px ${color}60)`
    : `drop-shadow(0 2px 4px rgba(0,0,0,0.25))`;
  const half = size / 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}">
      ${ring}
      <path d="M${half} 2C${half - 9} 2 ${half - 17} ${half - 9} ${half - 17} ${half}C${half - 17} ${half + 13} ${half} ${size + 8} ${half} ${size + 8}C${half} ${size + 8} ${half + 17} ${half + 13} ${half + 17} ${half}C${half + 17} ${half - 9} ${half + 9} 2 ${half} 2Z"
            fill="${color}" filter="${shadow}"/>
      <circle cx="${half}" cy="${half}" r="${half - 9}" fill="white" opacity="0.95"/>
      <text x="${half}" y="${half + 4}" text-anchor="middle" fill="${color}"
            font-family="system-ui,sans-serif" font-weight="700" font-size="${isSelected ? 10 : 9}">${initials}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size + 10],
    iconAnchor: [half, size + 10],
    popupAnchor: [0, -(size + 12)],
  });
};

// Office marker
const officeIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#374151;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"/>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ── Helper components ─────────────────────────────────────────────────────────
function MapController({
  flyTo,
  onMarkerClick,
}: {
  flyTo: { lat: number; lng: number; techId: string } | null;
  onMarkerClick: (techId: string) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!flyTo) return;
    map.flyTo([flyTo.lat, flyTo.lng], 16, { animate: true, duration: 1 });
  }, [flyTo]);
  return null;
}

function FitBounds({ locations }: { locations: TechnicianLocation[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || locations.length === 0) return;
    fitted.current = true;
    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 15);
    } else {
      map.fitBounds(
        L.latLngBounds(locations.map((l) => [l.latitude, l.longitude])),
        { padding: [60, 60] },
      );
    }
  }, [locations.length]);
  return null;
}

function RecenterControl({ locations }: { locations: TechnicianLocation[] }) {
  const map = useMap();
  return (
    <div
      className="leaflet-top leaflet-right"
      style={{ marginTop: "10px", marginRight: "10px", zIndex: 999 }}
    >
      <div className="leaflet-control">
        <button
          title="Pusatkan semua teknisi"
          onClick={() => {
            if (!locations.length) return;
            if (locations.length === 1) {
              map.flyTo([locations[0].latitude, locations[0].longitude], 15, {
                duration: 0.8,
              });
            } else {
              map.fitBounds(
                L.latLngBounds(locations.map((l) => [l.latitude, l.longitude])),
                { padding: [60, 60], animate: true },
              );
            }
          }}
          style={{
            width: "32px",
            height: "32px",
            background: "white",
            border: "2px solid rgba(0,0,0,0.12)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#374151",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Utils ────────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getTimeInfo = (recordedAt: string) => {
  const mins = (Date.now() - new Date(recordedAt).getTime()) / 60000;
  if (mins < 2) return { color: "#16a34a", bg: "#dcfce7", label: "Baru saja" };
  if (mins < 10)
    return { color: "#d97706", bg: "#fef9c3", label: "Beberapa menit lalu" };
  return { color: "#dc2626", bg: "#fee2e2", label: "Tidak aktif" };
};

const formatTime = (recordedAt: string) =>
  format(new Date(recordedAt), "HH:mm", { locale: localeId });

// ── Main Component ────────────────────────────────────────────────────────────
export default function TechnicianTracking() {
  const [locations, setLocations] = useState<TechnicianLocation[]>([]);
  const [routeHistory, setRouteHistory] = useState<RouteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [showRoutes, setShowRoutes] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "on_job" | "standby"
  >("all");
  const [flyTo, setFlyTo] = useState<{
    lat: number;
    lng: number;
    techId: string;
  } | null>(null);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const colorMap = useRef<Record<string, string>>({});
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getColor = (id: string) => {
    if (!colorMap.current[id]) {
      colorMap.current[id] =
        COLORS[Object.keys(colorMap.current).length % COLORS.length];
    }
    return colorMap.current[id];
  };

  // ── Fetch latest location per technician ──────────────────────────────────
  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("technician_locations")
        .select(
          `
          id, technician_id, service_id, latitude, longitude,
          accuracy, recorded_at, is_active,
          technician:employees!technician_locations_technician_id_fkey (name, status, phone),
          service:invoice_services (
            title, service_address,
            invoice:invoices (invoice_number, customer:customers (name))
          )
        `,
        )
        .eq("is_active", true)
        .order("recorded_at", { ascending: false });

      if (error) throw error;

      const seen = new Set<string>();
      const latest: TechnicianLocation[] = [];

      for (const row of data || []) {
        if (seen.has(row.technician_id)) continue;
        seen.add(row.technician_id);

        const tech = Array.isArray(row.technician)
          ? row.technician[0]
          : row.technician;
        const svc = Array.isArray(row.service) ? row.service[0] : row.service;
        const inv = svc
          ? Array.isArray(svc.invoice)
            ? svc.invoice[0]
            : svc.invoice
          : null;
        const cust = inv
          ? Array.isArray(inv.customer)
            ? inv.customer[0]
            : inv.customer
          : null;

        latest.push({
          id: row.id,
          technician_id: row.technician_id,
          service_id: row.service_id,
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy,
          recorded_at: row.recorded_at,
          is_active: row.is_active,
          technician_name: tech?.name || "Unknown",
          technician_phone: tech?.phone || null,
          technician_status: tech?.status || "available",
          service_title: svc?.title || null,
          service_address: svc?.service_address || null,
          customer_name: cust?.name || null,
          invoice_number: inv?.invoice_number || null,
        });
      }

      setLocations(latest);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch route history per technician ────────────────────────────────────
  const fetchRouteHistory = useCallback(async (techIds: string[]) => {
    if (!techIds.length) return;
    try {
      const { data } = await supabase
        .from("technician_locations")
        .select("technician_id, latitude, longitude, recorded_at")
        .in("technician_id", techIds)
        .eq("is_active", true)
        .order("recorded_at", { ascending: true })
        .limit(200);

      // Group by technician
      const groups: Record<string, [number, number][]> = {};
      for (const row of data || []) {
        if (!groups[row.technician_id]) groups[row.technician_id] = [];
        groups[row.technician_id].push([row.latitude, row.longitude]);
      }

      setRouteHistory(
        Object.entries(groups).map(([technician_id, points]) => ({
          technician_id,
          points,
        })),
      );
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    if (!isLive) return;
    const iv = setInterval(fetchLocations, 30000);
    return () => clearInterval(iv);
  }, [isLive, fetchLocations]);

  useEffect(() => {
    if (showRoutes && locations.length > 0) {
      fetchRouteHistory(locations.map((l) => l.technician_id));
    }
  }, [showRoutes, locations]);

  useEffect(() => {
    if (!isLive) return;
    const ch = supabase
      .channel("tech_loc_tracking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technician_locations" },
        fetchLocations,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isLive, fetchLocations]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Card click → zoom map + open popup
  const handleCardClick = (loc: TechnicianLocation) => {
    const isAlreadySelected = selectedTechId === loc.technician_id;
    setSelectedTechId(isAlreadySelected ? null : loc.technician_id);
    if (!isAlreadySelected) {
      setFlyTo({
        lat: loc.latitude,
        lng: loc.longitude,
        techId: loc.technician_id,
      });
      setOpenPopupId(loc.technician_id);
    }
  };

  // Marker click → highlight card + scroll to it
  const handleMarkerClick = (techId: string) => {
    setSelectedTechId(techId);
    setOpenPopupId(techId);
    // Scroll card into view
    setTimeout(() => {
      cardRefs.current[techId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  // WhatsApp
  const handleWhatsApp = (phone: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleaned = phone.replace(/\D/g, "").replace(/^0/, "62");
    window.open(
      `https://wa.me/${cleaned}?text=Halo ${name}, ada yang perlu dikonfirmasi mengenai job aktif kamu.`,
      "_blank",
    );
  };

  // Call
  const handleCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  // ── Filtered locations ────────────────────────────────────────────────────
  const filteredLocations = locations.filter((loc) => {
    if (statusFilter === "on_job") return !!loc.service_id;
    if (statusFilter === "standby") return !loc.service_id;
    return true;
  });

  const activeOnJob = locations.filter((l) => l.service_id).length;
  const defaultCenter: [number, number] = [-7.983908, 113.628];

  return (
    <DashboardLayout>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        .trk { animation: fadeIn 0.2s ease; font-family: 'Inter','DM Sans',system-ui,sans-serif; }

        /* Leaflet popup */
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important; padding: 0 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          border: 1px solid #e5e7eb !important;
        }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-popup-close-button {
          top: 10px !important; right: 10px !important;
          color: #9ca3af !important; font-size: 18px !important; z-index: 10;
        }

        /* Tech card */
        .tc {
          border-radius: 10px; border: 1.5px solid #e5e7eb;
          background: white; cursor: pointer;
          transition: all 0.15s ease; position: relative;
          overflow: hidden;
        }
        .tc:hover { border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
        .tc.sel { border-color: var(--c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 15%, transparent); }
        .tc::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--c); border-radius: 0 2px 2px 0;
          opacity: 0; transition: opacity 0.15s;
        }
        .tc:hover::before, .tc.sel::before { opacity: 1; }

        .action-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 6px; border: 1px solid #e5e7eb;
          background: white; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.12s; color: #374151;
        }
        .action-btn:hover { background: #f9fafb; border-color: #d1d5db; }
        .action-btn.wa:hover { background: #f0fdf4; border-color: #86efac; color: #16a34a; }
        .action-btn.call:hover { background: #eff6ff; border-color: #93c5fd; color: #2563eb; }

        .filter-tab {
          padding: 5px 12px; border-radius: 6px; border: none;
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.12s; background: none; color: #6b7280;
        }
        .filter-tab.active { background: white; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .filter-tab:not(.active):hover { background: rgba(255,255,255,0.6); }

        @keyframes pulsedot { 0%{box-shadow:0 0 0 0 rgba(22,163,74,0.4)} 70%{box-shadow:0 0 0 8px rgba(22,163,74,0)} 100%{box-shadow:0 0 0 0 rgba(22,163,74,0)} }
        .pdot { display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a; animation:pulsedot 2s infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .skeleton { background:linear-gradient(90deg,#f3f4f6 25%,#e9ebee 50%,#f3f4f6 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
      `}</style>

      <div
        className="trk"
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
              }}
            >
              <Crosshair
                style={{ width: "18px", height: "18px", color: "white" }}
              />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Tracking Teknisi
                </h1>
                {isLive && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "20px",
                      padding: "2px 8px",
                    }}
                  >
                    <span className="pdot" />
                    <span
                      style={{
                        color: "#16a34a",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                )}
              </div>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "12px",
                  margin: "2px 0 0",
                }}
              >
                Diperbarui {format(lastUpdated, "HH:mm:ss")} ·{" "}
                {filteredLocations.length} teknisi ditampilkan
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Route toggle */}
            <button
              onClick={() => setShowRoutes((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                background: showRoutes ? "#eff6ff" : "white",
                border: `1.5px solid ${showRoutes ? "#93c5fd" : "#e5e7eb"}`,
                color: showRoutes ? "#2563eb" : "#374151",
                fontSize: "12px",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              <Route style={{ width: "14px", height: "14px" }} />
              {showRoutes ? "Sembunyikan Rute" : "Tampilkan Rute"}
            </button>

            {/* Live toggle */}
            <button
              onClick={() => setIsLive((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                background: isLive ? "#f0fdf4" : "white",
                border: `1.5px solid ${isLive ? "#86efac" : "#e5e7eb"}`,
                color: isLive ? "#16a34a" : "#6b7280",
                fontSize: "12px",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              {isLive ? (
                <Wifi style={{ width: "14px", height: "14px" }} />
              ) : (
                <WifiOff style={{ width: "14px", height: "14px" }} />
              )}
              {isLive ? "Live" : "Paused"}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchLocations}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                background: "white",
                border: "1.5px solid #e5e7eb",
                color: "#374151",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <RefreshCw
                style={{ width: "14px", height: "14px" }}
                className={loading ? "spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: "12px",
          }}
        >
          {[
            {
              label: "Teknisi Online",
              value: locations.length,
              icon: Activity,
              color: "#2563eb",
              bg: "#dbeafe",
            },
            {
              label: "Sedang Bertugas",
              value: activeOnJob,
              icon: Navigation,
              color: "#16a34a",
              bg: "#dcfce7",
            },
            {
              label: "Standby",
              value: locations.length - activeOnJob,
              icon: Signal,
              color: "#d97706",
              bg: "#fef9c3",
            },
            {
              label: "Update Terakhir",
              value: format(lastUpdated, "HH:mm"),
              icon: Clock,
              color: "#7c3aed",
              bg: "#ede9fe",
              isText: true,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "18px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: 0,
                  }}
                >
                  {s.label}
                </p>
                <div
                  style={{
                    background: s.bg,
                    borderRadius: "7px",
                    padding: "6px",
                  }}
                >
                  <s.icon
                    style={{ width: "14px", height: "14px", color: s.color }}
                  />
                </div>
              </div>
              <p
                style={{
                  fontSize: (s as any).isText ? "20px" : "28px",
                  fontWeight: 700,
                  color: "#111827",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Map + Sidebar ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* Map */}
          <div
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              height: "580px",
            }}
          >
            {loading ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f9fafb",
                  gap: "12px",
                }}
              >
                <div
                  className="spin"
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "3px solid #e5e7eb",
                    borderTop: "3px solid #2563eb",
                    borderRadius: "50%",
                  }}
                />
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                  Memuat peta...
                </p>
              </div>
            ) : (
              <MapContainer
                center={
                  filteredLocations.length > 0
                    ? [
                        filteredLocations[0].latitude,
                        filteredLocations[0].longitude,
                      ]
                    : defaultCenter
                }
                zoom={filteredLocations.length > 0 ? 13 : 9}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <MapController
                  flyTo={flyTo}
                  onMarkerClick={handleMarkerClick}
                />
                <FitBounds locations={filteredLocations} />
                <RecenterControl locations={filteredLocations} />

                {/* Route polylines */}
                {showRoutes &&
                  routeHistory.map((route) => {
                    const color = getColor(route.technician_id);
                    return (
                      <Polyline
                        key={route.technician_id}
                        positions={route.points}
                        color={color}
                        weight={3}
                        opacity={0.5}
                        dashArray="6,4"
                      />
                    );
                  })}

                {/* Technician markers */}
                {filteredLocations.map((loc) => {
                  const color = getColor(loc.technician_id);
                  const isSelected = selectedTechId === loc.technician_id;
                  const timeInfo = getTimeInfo(loc.recorded_at);

                  return (
                    <Marker
                      key={loc.technician_id}
                      position={[loc.latitude, loc.longitude]}
                      icon={createMarkerIcon(
                        color,
                        getInitials(loc.technician_name),
                        isSelected,
                      )}
                      ref={(m) => {
                        if (m) markerRefs.current[loc.technician_id] = m;
                      }}
                      eventHandlers={{
                        click: () => handleMarkerClick(loc.technician_id),
                        popupopen: () => setOpenPopupId(loc.technician_id),
                        popupclose: () =>
                          setOpenPopupId((p) =>
                            p === loc.technician_id ? null : p,
                          ),
                      }}
                    >
                      <Popup autoPan={false}>
                        <div
                          style={{
                            padding: "16px",
                            minWidth: "240px",
                            fontFamily: "system-ui,sans-serif",
                          }}
                        >
                          {/* Header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "12px",
                              paddingBottom: "12px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                background: color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "white",
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(loc.technician_name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontWeight: 700,
                                  color: "#111827",
                                  fontSize: "14px",
                                  margin: "0 0 3px",
                                }}
                              >
                                {loc.technician_name}
                              </p>
                              <span
                                style={{
                                  background: loc.service_id
                                    ? "#dcfce7"
                                    : "#f3f4f6",
                                  color: loc.service_id ? "#16a34a" : "#6b7280",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  padding: "1px 7px",
                                  borderRadius: "20px",
                                }}
                              >
                                {loc.service_id ? "Sedang Bertugas" : "Standby"}
                              </span>
                            </div>
                          </div>

                          {/* Job detail */}
                          {loc.service_title && (
                            <div
                              style={{
                                background: "#eff6ff",
                                borderRadius: "8px",
                                padding: "10px",
                                marginBottom: "10px",
                              }}
                            >
                              <p
                                style={{
                                  color: "#6b7280",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  margin: "0 0 4px",
                                }}
                              >
                                Job Aktif
                              </p>
                              <p
                                style={{
                                  color: "#1d4ed8",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  margin: "0 0 2px",
                                }}
                              >
                                {loc.service_title}
                              </p>
                              {loc.customer_name && (
                                <p
                                  style={{
                                    color: "#374151",
                                    fontSize: "12px",
                                    margin: "0 0 1px",
                                  }}
                                >
                                  👤 {loc.customer_name}
                                </p>
                              )}
                              {loc.service_address && (
                                <p
                                  style={{
                                    color: "#6b7280",
                                    fontSize: "11px",
                                    margin: 0,
                                  }}
                                >
                                  📍 {loc.service_address}
                                </p>
                              )}
                              {loc.invoice_number && (
                                <p
                                  style={{
                                    color: "#9ca3af",
                                    fontSize: "10px",
                                    fontFamily: "monospace",
                                    margin: "3px 0 0",
                                  }}
                                >
                                  {loc.invoice_number}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Footer */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  color: "#9ca3af",
                                  fontSize: "10px",
                                  margin: "0 0 1px",
                                }}
                              >
                                Update terakhir
                              </p>
                              <span
                                style={{
                                  background: timeInfo.bg,
                                  color: timeInfo.color,
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "1px 7px",
                                  borderRadius: "20px",
                                }}
                              >
                                {formatTime(loc.recorded_at)} ·{" "}
                                {formatDistanceToNow(
                                  new Date(loc.recorded_at),
                                  { addSuffix: true, locale: localeId },
                                )}
                              </span>
                            </div>
                            {loc.accuracy && (
                              <span
                                style={{ color: "#d1d5db", fontSize: "11px" }}
                              >
                                ±{Math.round(loc.accuracy)}m
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          {loc.technician_phone && (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                marginTop: "10px",
                                paddingTop: "10px",
                                borderTop: "1px solid #f3f4f6",
                              }}
                            >
                              <button
                                className="action-btn wa"
                                style={{ flex: 1, justifyContent: "center" }}
                                onClick={(e) =>
                                  handleWhatsApp(
                                    loc.technician_phone!,
                                    loc.technician_name,
                                    e,
                                  )
                                }
                              >
                                <MessageCircle
                                  style={{ width: "12px", height: "12px" }}
                                />{" "}
                                WhatsApp
                              </button>
                              <button
                                className="action-btn call"
                                style={{ flex: 1, justifyContent: "center" }}
                                onClick={(e) =>
                                  handleCall(loc.technician_phone!, e)
                                }
                              >
                                <Phone
                                  style={{ width: "12px", height: "12px" }}
                                />{" "}
                                Telepon
                              </button>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Filter tabs */}
            <div
              style={{
                background: "white",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                padding: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  background: "#f3f4f6",
                  borderRadius: "7px",
                  padding: "3px",
                  gap: "2px",
                }}
              >
                {[
                  { value: "all", label: `Semua (${locations.length})` },
                  { value: "on_job", label: `Bertugas (${activeOnJob})` },
                  {
                    value: "standby",
                    label: `Standby (${locations.length - activeOnJob})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    className={`filter-tab${statusFilter === tab.value ? " active" : ""}`}
                    onClick={() => setStatusFilter(tab.value as any)}
                    style={{ flex: 1 }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Technician list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxHeight: "490px",
                overflowY: "auto",
              }}
            >
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "white",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      padding: "14px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div
                        className="skeleton"
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div
                          className="skeleton"
                          style={{ height: "12px", width: "60%" }}
                        />
                        <div
                          className="skeleton"
                          style={{ height: "10px", width: "40%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredLocations.length === 0 ? (
                <div
                  style={{
                    background: "white",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    padding: "32px 16px",
                    textAlign: "center",
                  }}
                >
                  <MapPin
                    style={{
                      width: "24px",
                      height: "24px",
                      color: "#d1d5db",
                      margin: "0 auto 8px",
                      display: "block",
                    }}
                  />
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "13px",
                      fontWeight: 600,
                      margin: "0 0 2px",
                    }}
                  >
                    Tidak ada teknisi
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: "11px", margin: 0 }}>
                    {statusFilter !== "all"
                      ? "Coba ganti filter"
                      : "Lokasi muncul saat teknisi online"}
                  </p>
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const color = getColor(loc.technician_id);
                  const isSelected = selectedTechId === loc.technician_id;
                  const timeInfo = getTimeInfo(loc.recorded_at);

                  return (
                    <div
                      key={loc.technician_id}
                      ref={(el) => {
                        cardRefs.current[loc.technician_id] = el;
                      }}
                      className={`tc${isSelected ? " sel" : ""}`}
                      style={{ "--c": color } as any}
                      onClick={() => handleCardClick(loc)}
                    >
                      <div style={{ padding: "12px" }}>
                        {/* Top row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "white",
                            }}
                          >
                            {getInitials(loc.technician_name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#111827",
                                margin: "0 0 2px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {loc.technician_name}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <span
                                style={{
                                  width: "5px",
                                  height: "5px",
                                  borderRadius: "50%",
                                  background: timeInfo.color,
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: timeInfo.color,
                                  fontWeight: 600,
                                }}
                              >
                                {formatTime(loc.recorded_at)}
                              </span>
                              <span
                                style={{ fontSize: "10px", color: "#d1d5db" }}
                              >
                                ·
                              </span>
                              <span
                                style={{ fontSize: "10px", color: "#9ca3af" }}
                              >
                                {formatDistanceToNow(
                                  new Date(loc.recorded_at),
                                  { addSuffix: true, locale: localeId },
                                )}
                              </span>
                            </div>
                          </div>
                          {/* Status dot */}
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              color: loc.service_id ? "#16a34a" : "#6b7280",
                              background: loc.service_id
                                ? "#dcfce7"
                                : "#f3f4f6",
                              padding: "2px 7px",
                              borderRadius: "20px",
                              flexShrink: 0,
                            }}
                          >
                            {loc.service_id ? "Bertugas" : "Standby"}
                          </span>
                        </div>

                        {/* Job detail */}
                        {loc.service_title && (
                          <div
                            style={{
                              background: "#f8fafc",
                              borderRadius: "6px",
                              padding: "8px",
                              marginBottom: "8px",
                              borderLeft: `2px solid ${color}`,
                            }}
                          >
                            <p
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#374151",
                                margin: "0 0 2px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              📋 {loc.service_title}
                            </p>
                            {loc.customer_name && (
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#6b7280",
                                  margin: "0 0 1px",
                                }}
                              >
                                👤 {loc.customer_name}
                              </p>
                            )}
                            {loc.service_address && (
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#9ca3af",
                                  margin: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                📍 {loc.service_address}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        {loc.technician_phone && (
                          <div
                            style={{ display: "flex", gap: "5px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="action-btn wa"
                              style={{ flex: 1, justifyContent: "center" }}
                              onClick={(e) =>
                                handleWhatsApp(
                                  loc.technician_phone!,
                                  loc.technician_name,
                                  e,
                                )
                              }
                            >
                              <MessageCircle
                                style={{ width: "11px", height: "11px" }}
                              />
                              WhatsApp
                            </button>
                            <button
                              className="action-btn call"
                              style={{ flex: 1, justifyContent: "center" }}
                              onClick={(e) =>
                                handleCall(loc.technician_phone!, e)
                              }
                            >
                              <Phone
                                style={{ width: "11px", height: "11px" }}
                              />
                              Telepon
                            </button>
                          </div>
                        )}

                        {/* Zoom hint */}
                        {isSelected && (
                          <p
                            style={{
                              fontSize: "10px",
                              color: "#9ca3af",
                              textAlign: "center",
                              margin: "6px 0 0",
                            }}
                          >
                            🗺 Peta dipusatkan ke lokasi ini
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
