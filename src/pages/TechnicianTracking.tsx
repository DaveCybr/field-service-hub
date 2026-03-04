// ============================================
// FILE: src/pages/TechnicianTracking.tsx
//
// Schema facts (dari types.ts):
// - technician_locations: id, technician_id (nullable), latitude, longitude,
//                         accuracy, recorded_at, is_active, updated_at
//   → isOneToOne FK ke employees
//
// - Status "on_job" diambil dari employees.status (enum: available|on_job|locked|off_duty)
//
// - Job aktif diambil dari invoice_services.assigned_technician_id
//   (FK langsung ke employees) dengan status bukan completed/cancelled
//
// - TIDAK ada service_id di technician_locations
// - TIDAK perlu service_technician_assignments untuk tracking ini
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
  Route,
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
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icons
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
  technician_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  // dari employees
  technician_name: string;
  technician_phone: string | null;
  technician_status: "available" | "on_job" | "locked" | "off_duty";
  // dari invoice_services (assigned_technician_id)
  service_id: string | null;
  service_title: string | null;
  service_address: string | null;
  customer_name: string | null;
  invoice_number: string | null;
}

interface RoutePoint {
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
const DEFAULT_CENTER: [number, number] = [-7.983908, 113.628];
// invoice_services.status values yang berarti "aktif"
const ACTIVE_SERVICE_STATUSES = ["pending", "approved", "in_progress"];

// ── Icon factory ─────────────────────────────────────────────────────────────
function makeIcon(color: string, initials: string, selected: boolean) {
  const s = selected ? 48 : 40,
    h = s / 2;
  const ring = selected
    ? `<circle cx="${h}" cy="${h}" r="${h - 1}" fill="none" stroke="${color}" stroke-width="2" opacity="0.3"/>`
    : "";
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s + 10}" viewBox="0 0 ${s} ${s + 10}">
      ${ring}
      <path d="M${h} 2C${h - 9} 2 ${h - 17} ${h - 9} ${h - 17} ${h}C${h - 17} ${h + 13} ${h} ${s + 8} ${h} ${s + 8}S${h + 17} ${h + 13} ${h + 17} ${h}C${h + 17} ${h - 9} ${h + 9} 2 ${h} 2Z"
        fill="${color}" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"/>
      <circle cx="${h}" cy="${h}" r="${h - 9}" fill="white" opacity="0.95"/>
      <text x="${h}" y="${h + 4}" text-anchor="middle" fill="${color}"
        font-family="system-ui,sans-serif" font-weight="700" font-size="${selected ? 10 : 9}">${initials}</text>
    </svg>`,
    className: "",
    iconSize: [s, s + 10],
    iconAnchor: [h, s + 10],
    popupAnchor: [0, -(s + 12)],
  });
}

// ── Map helpers ───────────────────────────────────────────────────────────────
function MapFlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target)
      map.flyTo([target.lat, target.lng], 16, { animate: true, duration: 1 });
  }, [target]);
  return null;
}

function FitAll({ locs }: { locs: TechnicianLocation[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !locs.length) return;
    done.current = true;
    locs.length === 1
      ? map.setView([locs[0].latitude, locs[0].longitude], 15)
      : map.fitBounds(
          L.latLngBounds(locs.map((l) => [l.latitude, l.longitude])),
          { padding: [60, 60] },
        );
  }, [locs.length]);
  return null;
}

function RecenterBtn({ locs }: { locs: TechnicianLocation[] }) {
  const map = useMap();
  return (
    <div
      className="leaflet-top leaflet-right"
      style={{ marginTop: 10, marginRight: 10, zIndex: 999 }}
    >
      <div className="leaflet-control">
        <button
          title="Pusatkan semua teknisi"
          onClick={() => {
            if (!locs.length) return;
            locs.length === 1
              ? map.flyTo([locs[0].latitude, locs[0].longitude], 15, {
                  duration: 0.8,
                })
              : map.fitBounds(
                  L.latLngBounds(locs.map((l) => [l.latitude, l.longitude])),
                  { padding: [60, 60], animate: true },
                );
          }}
          style={{
            width: 32,
            height: 32,
            background: "white",
            border: "2px solid rgba(0,0,0,0.12)",
            borderRadius: 6,
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

// ── Utils ─────────────────────────────────────────────────────────────────────
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const timeInfo = (t: string) => {
  const mins = (Date.now() - new Date(t).getTime()) / 60000;
  if (mins < 2) return { color: "#16a34a", bg: "#dcfce7" };
  if (mins < 10) return { color: "#d97706", bg: "#fef9c3" };
  return { color: "#dc2626", bg: "#fee2e2" };
};

const hhmm = (t: string) => format(new Date(t), "HH:mm", { locale: localeId });

// ── Main Component ────────────────────────────────────────────────────────────
export default function TechnicianTracking() {
  const [locs, setLocs] = useState<TechnicianLocation[]>([]);
  const [routes, setRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [showRoutes, setShowRoutes] = useState(false);
  const [filter, setFilter] = useState<"all" | "on_job" | "standby">("all");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);

  const colorMap = useRef<Record<string, string>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const markerRef = useRef<Record<string, L.Marker>>({});

  const color = (id: string) => {
    if (!colorMap.current[id])
      colorMap.current[id] =
        COLORS[Object.keys(colorMap.current).length % COLORS.length];
    return colorMap.current[id];
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLocs = useCallback(async () => {
    try {
      // Step 1: Ambil satu lokasi terbaru per teknisi + info employee
      // technician_locations → employees (isOneToOne FK)
      const { data: locRows, error: locErr } = await supabase
        .from("technician_locations")
        .select(
          `
          technician_id,
          latitude, longitude, accuracy, recorded_at,
          employee:employees!technician_locations_technician_id_fkey (
            id, name, phone, status
          )
        `,
        )
        .eq("is_active", true)
        .order("recorded_at", { ascending: false });

      if (locErr) throw locErr;

      // Deduplicate — satu per technician_id
      const seen = new Set<string>();
      const raw: any[] = [];
      for (const row of locRows ?? []) {
        const tid = row.technician_id;
        if (!tid || seen.has(tid)) continue;
        seen.add(tid);
        raw.push(row);
      }

      if (!raw.length) {
        setLocs([]);
        setUpdated(new Date());
        return;
      }

      // Step 2: Ambil job aktif via invoice_services.assigned_technician_id
      // (FK: invoice_services_assigned_technician_id_fkey → employees)
      const techIds = raw.map((r) => r.technician_id);

      const { data: services, error: svcErr } = await supabase
        .from("invoice_services")
        .select(
          `
          id, title, service_address, status,
          assigned_technician_id,
          invoice:invoices!invoice_services_invoice_id_fkey (
            invoice_number,
            customer:customers!invoices_customer_id_fkey ( name )
          )
        `,
        )
        .in("assigned_technician_id", techIds)
        .in("status", ACTIVE_SERVICE_STATUSES)
        .order("updated_at", { ascending: false });

      if (svcErr) throw svcErr;

      // Build map: technician_id → first active service
      const svcMap: Record<
        string,
        {
          id: string;
          title: string;
          address: string | null;
          customer: string | null;
          invoice: string | null;
        }
      > = {};

      for (const svc of services ?? []) {
        const tid = svc.assigned_technician_id;
        if (!tid || svcMap[tid]) continue; // keep first
        const inv = Array.isArray(svc.invoice) ? svc.invoice[0] : svc.invoice;
        const cust = inv
          ? Array.isArray(inv.customer)
            ? inv.customer[0]
            : inv.customer
          : null;
        svcMap[tid] = {
          id: svc.id,
          title: svc.title,
          address: svc.service_address ?? null,
          customer: cust?.name ?? null,
          invoice: inv?.invoice_number ?? null,
        };
      }

      // Step 3: Merge
      const merged: TechnicianLocation[] = raw.map((row) => {
        const emp = Array.isArray(row.employee)
          ? row.employee[0]
          : row.employee;
        const job = svcMap[row.technician_id] ?? null;
        return {
          technician_id: row.technician_id,
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy ?? null,
          recorded_at: row.recorded_at,
          technician_name: emp?.name ?? "Unknown",
          technician_phone: emp?.phone ?? null,
          technician_status: emp?.status ?? "available",
          service_id: job?.id ?? null,
          service_title: job?.title ?? null,
          service_address: job?.address ?? null,
          customer_name: job?.customer ?? null,
          invoice_number: job?.invoice ?? null,
        };
      });

      setLocs(merged);
      setUpdated(new Date());
    } catch (err) {
      console.error("TechnicianTracking fetchLocs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoutes = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const { data } = await supabase
      .from("technician_locations")
      .select("technician_id, latitude, longitude")
      .in("technician_id", ids)
      .eq("is_active", true)
      .order("recorded_at", { ascending: true })
      .limit(400);

    const g: Record<string, [number, number][]> = {};
    for (const r of data ?? []) {
      if (!r.technician_id) continue;
      (g[r.technician_id] ??= []).push([r.latitude, r.longitude]);
    }
    setRoutes(
      Object.entries(g).map(([technician_id, points]) => ({
        technician_id,
        points,
      })),
    );
  }, []);

  // Polling + realtime
  useEffect(() => {
    fetchLocs();
    if (!live) return;
    const iv = setInterval(fetchLocs, 30_000);
    return () => clearInterval(iv);
  }, [live, fetchLocs]);

  useEffect(() => {
    if (showRoutes && locs.length)
      fetchRoutes(locs.map((l) => l.technician_id));
  }, [showRoutes, locs]);

  useEffect(() => {
    if (!live) return;
    const ch = supabase
      .channel("trk_locs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technician_locations" },
        fetchLocs,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [live, fetchLocs]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onCardClick = (loc: TechnicianLocation) => {
    const same = selected === loc.technician_id;
    setSelected(same ? null : loc.technician_id);
    if (!same) setFlyTo({ lat: loc.latitude, lng: loc.longitude });
  };

  const onMarkerClick = (tid: string) => {
    setSelected(tid);
    setTimeout(
      () =>
        cardRefs.current[tid]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      100,
    );
  };

  const onWA = (phone: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const p = phone.replace(/\D/g, "").replace(/^0/, "62");
    window.open(
      `https://wa.me/${p}?text=Halo ${name}, ada yang perlu dikonfirmasi mengenai job aktif kamu.`,
      "_blank",
    );
  };
  const onCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  // "on_job" = punya job aktif (dari invoice_services) ATAU status employee = on_job
  const isOnJob = (l: TechnicianLocation) =>
    !!l.service_id || l.technician_status === "on_job";

  const filtered = locs.filter((l) =>
    filter === "on_job"
      ? isOnJob(l)
      : filter === "standby"
        ? !isOnJob(l)
        : true,
  );

  const countOnJob = locs.filter(isOnJob).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .trk{font-family:'Plus Jakarta Sans',system-ui,sans-serif;animation:fadeUp .2s ease}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        .leaflet-popup-content-wrapper{border-radius:12px!important;padding:0!important;box-shadow:0 8px 24px rgba(0,0,0,.12)!important;border:1px solid #e2e8f0!important}
        .leaflet-popup-content{margin:0!important}
        .leaflet-popup-tip-container{display:none!important}
        .leaflet-popup-close-button{top:10px!important;right:10px!important;color:#9ca3af!important;font-size:18px!important;z-index:10}
        .tc{border-radius:10px;border:1.5px solid #e2e8f0;background:white;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
        .tc:hover{border-color:#cbd5e1;box-shadow:0 2px 8px rgba(0,0,0,.07)}
        .tc.sel{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 15%,transparent)}
        .tc::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c);border-radius:0 2px 2px 0;opacity:0;transition:opacity .15s}
        .tc:hover::before,.tc.sel::before{opacity:1}
        .abtn{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid #e2e8f0;background:white;font-size:11px;font-weight:600;cursor:pointer;transition:all .12s;color:#475569;font-family:inherit}
        .abtn:hover{background:#f8fafc;border-color:#cbd5e1}
        .abtn.wa:hover{background:#f0fdf4;border-color:#86efac;color:#16a34a}
        .abtn.call:hover{background:#eff6ff;border-color:#93c5fd;color:#2563eb}
        .ftab{padding:5px 12px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .12s;background:none;color:#64748b;font-family:inherit}
        .ftab.on{background:white;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.1)}
        .ftab:not(.on):hover{background:rgba(255,255,255,.6)}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.4)}70%{box-shadow:0 0 0 8px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
        .pdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;animation:pulse 2s infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin .8s linear infinite}
        .skel{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .sc{transition:box-shadow .18s,transform .18s}
        .sc:hover{box-shadow:0 8px 32px -4px rgba(15,23,42,.10);transform:translateY(-1px)}
      `}</style>

      <div
        className="trk"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              Operasional
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Tracking Teknisi
              </h1>
              {live && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 20,
                    padding: "2px 8px",
                  }}
                >
                  <span className="pdot" />
                  <span
                    style={{
                      color: "#16a34a",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                    }}
                  >
                    LIVE
                  </span>
                </div>
              )}
            </div>
            <p style={{ color: "#64748b", fontSize: 13, margin: "2px 0 0" }}>
              Diperbarui {format(updated, "HH:mm:ss")} · {filtered.length}{" "}
              teknisi ditampilkan
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowRoutes((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: showRoutes ? "#eff6ff" : "white",
                border: `1.5px solid ${showRoutes ? "#93c5fd" : "#e2e8f0"}`,
                color: showRoutes ? "#2563eb" : "#475569",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "all .15s",
              }}
            >
              <Route style={{ width: 14, height: 14 }} />
              {showRoutes ? "Sembunyikan Rute" : "Tampilkan Rute"}
            </button>
            <button
              onClick={() => setLive((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: live ? "#f0fdf4" : "white",
                border: `1.5px solid ${live ? "#86efac" : "#e2e8f0"}`,
                color: live ? "#16a34a" : "#475569",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "all .15s",
              }}
            >
              {live ? (
                <Wifi style={{ width: 14, height: 14 }} />
              ) : (
                <WifiOff style={{ width: 14, height: 14 }} />
              )}
              {live ? "Live" : "Paused"}
            </button>
            <button
              onClick={fetchLocs}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: "white",
                border: "1.5px solid #e2e8f0",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              <RefreshCw
                style={{ width: 14, height: 14 }}
                className={loading ? "spin" : ""}
              />{" "}
              Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
          }}
        >
          {(
            [
              {
                label: "Teknisi Online",
                val: locs.length,
                icon: Activity,
                c: "#2563eb",
                bg: "#dbeafe",
                border: "#bfdbfe",
              },
              {
                label: "Sedang Bertugas",
                val: countOnJob,
                icon: Navigation,
                c: "#16a34a",
                bg: "#dcfce7",
                border: "#bbf7d0",
              },
              {
                label: "Standby",
                val: locs.length - countOnJob,
                icon: Signal,
                c: "#d97706",
                bg: "#fef9c3",
                border: "#fde68a",
              },
              {
                label: "Update Terakhir",
                val: format(updated, "HH:mm"),
                icon: Clock,
                c: "#7c3aed",
                bg: "#ede9fe",
                border: "#ddd6fe",
                text: true,
              },
            ] as const
          ).map((s) => (
            <div
              key={s.label}
              className="sc"
              style={{
                background: "white",
                borderRadius: 12,
                border: `1px solid ${s.border}`,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    margin: 0,
                  }}
                >
                  {s.label}
                </p>
                <div style={{ background: s.bg, borderRadius: 8, padding: 7 }}>
                  <s.icon style={{ width: 14, height: 14, color: s.c }} />
                </div>
              </div>
              <p
                style={{
                  fontSize: (s as any).text ? 22 : 30,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.val}
              </p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>
                {(s as any).text ? "terakhir sync" : "teknisi"}
              </p>
            </div>
          ))}
        </div>

        {/* Map + Sidebar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Map */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              height: 580,
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
                  background: "#f8fafc",
                  gap: 12,
                }}
              >
                <div
                  className="spin"
                  style={{
                    width: 36,
                    height: 36,
                    border: "3px solid #e2e8f0",
                    borderTop: "3px solid #2563eb",
                    borderRadius: "50%",
                  }}
                />
                <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
                  Memuat peta...
                </p>
              </div>
            ) : (
              <MapContainer
                center={
                  filtered.length
                    ? [filtered[0].latitude, filtered[0].longitude]
                    : DEFAULT_CENTER
                }
                zoom={filtered.length ? 13 : 9}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapFlyTo target={flyTo} />
                <FitAll locs={filtered} />
                <RecenterBtn locs={filtered} />

                {showRoutes &&
                  routes.map((r) => (
                    <Polyline
                      key={r.technician_id}
                      positions={r.points}
                      color={color(r.technician_id)}
                      weight={3}
                      opacity={0.5}
                      dashArray="6,4"
                    />
                  ))}

                {filtered.map((loc) => {
                  const c = color(loc.technician_id);
                  const sel = selected === loc.technician_id;
                  const ti = timeInfo(loc.recorded_at);
                  const job = isOnJob(loc);
                  return (
                    <Marker
                      key={loc.technician_id}
                      position={[loc.latitude, loc.longitude]}
                      icon={makeIcon(c, initials(loc.technician_name), sel)}
                      ref={(m) => {
                        if (m) markerRef.current[loc.technician_id] = m;
                      }}
                      eventHandlers={{
                        click: () => onMarkerClick(loc.technician_id),
                      }}
                    >
                      <Popup autoPan={false}>
                        <div
                          style={{
                            padding: 16,
                            minWidth: 240,
                            fontFamily:
                              "'Plus Jakarta Sans',system-ui,sans-serif",
                          }}
                        >
                          {/* Popup header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginBottom: 12,
                              paddingBottom: 12,
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                background: c,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "white",
                                flexShrink: 0,
                              }}
                            >
                              {initials(loc.technician_name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  fontSize: 14,
                                  margin: "0 0 3px",
                                }}
                              >
                                {loc.technician_name}
                              </p>
                              <span
                                style={{
                                  background: job ? "#dcfce7" : "#f1f5f9",
                                  color: job ? "#16a34a" : "#64748b",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "1px 7px",
                                  borderRadius: 20,
                                }}
                              >
                                {job ? "Sedang Bertugas" : "Standby"}
                              </span>
                            </div>
                          </div>

                          {/* Job info */}
                          {loc.service_title && (
                            <div
                              style={{
                                background: "#eff6ff",
                                borderRadius: 8,
                                padding: 10,
                                marginBottom: 10,
                              }}
                            >
                              <p
                                style={{
                                  color: "#64748b",
                                  fontSize: 10,
                                  fontWeight: 700,
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
                                  fontSize: 13,
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
                                    fontSize: 12,
                                    margin: "0 0 1px",
                                  }}
                                >
                                  👤 {loc.customer_name}
                                </p>
                              )}
                              {loc.service_address && (
                                <p
                                  style={{
                                    color: "#64748b",
                                    fontSize: 11,
                                    margin: 0,
                                  }}
                                >
                                  📍 {loc.service_address}
                                </p>
                              )}
                              {loc.invoice_number && (
                                <p
                                  style={{
                                    color: "#94a3b8",
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                    margin: "3px 0 0",
                                  }}
                                >
                                  {loc.invoice_number}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Timestamp */}
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
                                  color: "#94a3b8",
                                  fontSize: 10,
                                  margin: "0 0 1px",
                                }}
                              >
                                Update terakhir
                              </p>
                              <span
                                style={{
                                  background: ti.bg,
                                  color: ti.color,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "1px 7px",
                                  borderRadius: 20,
                                }}
                              >
                                {hhmm(loc.recorded_at)} ·{" "}
                                {formatDistanceToNow(
                                  new Date(loc.recorded_at),
                                  { addSuffix: true, locale: localeId },
                                )}
                              </span>
                            </div>
                            {loc.accuracy != null && (
                              <span style={{ color: "#cbd5e1", fontSize: 11 }}>
                                ±{Math.round(loc.accuracy)}m
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          {loc.technician_phone && (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                marginTop: 10,
                                paddingTop: 10,
                                borderTop: "1px solid #f1f5f9",
                              }}
                            >
                              <button
                                className="abtn wa"
                                style={{ flex: 1, justifyContent: "center" }}
                                onClick={(e) =>
                                  onWA(
                                    loc.technician_phone!,
                                    loc.technician_name,
                                    e,
                                  )
                                }
                              >
                                <MessageCircle
                                  style={{ width: 12, height: 12 }}
                                />{" "}
                                WhatsApp
                              </button>
                              <button
                                className="abtn call"
                                style={{ flex: 1, justifyContent: "center" }}
                                onClick={(e) =>
                                  onCall(loc.technician_phone!, e)
                                }
                              >
                                <Phone style={{ width: 12, height: 12 }} />{" "}
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

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Filter tabs */}
            <div
              style={{
                background: "white",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                padding: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  background: "#f1f5f9",
                  borderRadius: 7,
                  padding: 3,
                  gap: 2,
                }}
              >
                {[
                  { v: "all", label: `Semua (${locs.length})` },
                  { v: "on_job", label: `Bertugas (${countOnJob})` },
                  {
                    v: "standby",
                    label: `Standby (${locs.length - countOnJob})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.v}
                    className={`ftab${filter === tab.v ? " on" : ""}`}
                    onClick={() => setFilter(tab.v as any)}
                    style={{ flex: 1 }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tech list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 490,
                overflowY: "auto",
              }}
            >
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "white",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      padding: 14,
                    }}
                  >
                    <div style={{ display: "flex", gap: 10 }}>
                      <div
                        className="skel"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          className="skel"
                          style={{ height: 12, width: "60%" }}
                        />
                        <div
                          className="skel"
                          style={{ height: 10, width: "40%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : !filtered.length ? (
                <div
                  style={{
                    background: "white",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: "32px 16px",
                    textAlign: "center",
                  }}
                >
                  <MapPin
                    style={{
                      width: 24,
                      height: 24,
                      color: "#cbd5e1",
                      margin: "0 auto 8px",
                      display: "block",
                    }}
                  />
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 700,
                      margin: "0 0 2px",
                    }}
                  >
                    Tidak ada teknisi
                  </p>
                  <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>
                    {filter !== "all"
                      ? "Coba ganti filter"
                      : "Lokasi muncul saat teknisi online"}
                  </p>
                </div>
              ) : (
                filtered.map((loc) => {
                  const c = color(loc.technician_id);
                  const sel = selected === loc.technician_id;
                  const ti = timeInfo(loc.recorded_at);
                  const job = isOnJob(loc);
                  return (
                    <div
                      key={loc.technician_id}
                      ref={(el) => {
                        cardRefs.current[loc.technician_id] = el;
                      }}
                      className={`tc${sel ? " sel" : ""}`}
                      style={{ "--c": c } as any}
                      onClick={() => onCardClick(loc)}
                    >
                      <div style={{ padding: 12 }}>
                        {/* Tech row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: loc.service_title ? 8 : 0,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: c,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "white",
                            }}
                          >
                            {initials(loc.technician_name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#0f172a",
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
                                gap: 5,
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  background: ti.color,
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 10,
                                  color: ti.color,
                                  fontWeight: 600,
                                }}
                              >
                                {hhmm(loc.recorded_at)}
                              </span>
                              <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                                ·
                              </span>
                              <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                {formatDistanceToNow(
                                  new Date(loc.recorded_at),
                                  { addSuffix: true, locale: localeId },
                                )}
                              </span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: job ? "#16a34a" : "#64748b",
                              background: job ? "#dcfce7" : "#f1f5f9",
                              padding: "2px 7px",
                              borderRadius: 20,
                              flexShrink: 0,
                            }}
                          >
                            {job ? "Bertugas" : "Standby"}
                          </span>
                        </div>

                        {/* Job detail */}
                        {loc.service_title && (
                          <div
                            style={{
                              background: "#f8fafc",
                              borderRadius: 6,
                              padding: 8,
                              marginBottom: 8,
                              borderLeft: `2px solid ${c}`,
                            }}
                          >
                            <p
                              style={{
                                fontSize: 11,
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
                                  fontSize: 10,
                                  color: "#64748b",
                                  margin: "0 0 1px",
                                }}
                              >
                                👤 {loc.customer_name}
                              </p>
                            )}
                            {loc.service_address && (
                              <p
                                style={{
                                  fontSize: 10,
                                  color: "#94a3b8",
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
                            style={{
                              display: "flex",
                              gap: 5,
                              marginTop: loc.service_title ? 0 : 8,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="abtn wa"
                              style={{ flex: 1, justifyContent: "center" }}
                              onClick={(e) =>
                                onWA(
                                  loc.technician_phone!,
                                  loc.technician_name,
                                  e,
                                )
                              }
                            >
                              <MessageCircle
                                style={{ width: 11, height: 11 }}
                              />{" "}
                              WhatsApp
                            </button>
                            <button
                              className="abtn call"
                              style={{ flex: 1, justifyContent: "center" }}
                              onClick={(e) => onCall(loc.technician_phone!, e)}
                            >
                              <Phone style={{ width: 11, height: 11 }} />{" "}
                              Telepon
                            </button>
                          </div>
                        )}

                        {sel && (
                          <p
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
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
