import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/currency";

interface Invoice {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  status: string;
  payment_status: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  grand_total: number;
  amount_paid?: number;
  notes?: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

interface InvoiceService {
  title?: string;
  service_title?: string;
  description?: string;
  service_description?: string;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
}

interface InvoiceItem {
  product?: { name: string };
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  total_price: number;
}

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  services: InvoiceService[];
  items: InvoiceItem[];
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "DRAFT",
  pending: "MENUNGGU",
  assigned: "DITUGASKAN",
  in_progress: "SEDANG DIKERJAKAN",
  completed: "SELESAI",
  paid: "LUNAS",
  cancelled: "DIBATALKAN",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "BELUM DIBAYAR",
  paid: "LUNAS",
  partial: "SEBAGIAN",
  overdue: "JATUH TEMPO",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "#b45309",
  paid: "#15803d",
  partial: "#1d4ed8",
  overdue: "#dc2626",
};

export function InvoicePrintTemplate({
  invoice,
  services,
  items,
  companyInfo,
}: InvoicePrintTemplateProps) {
  const remainingBalance = invoice.grand_total - (invoice.amount_paid || 0);
  const paymentColor =
    PAYMENT_STATUS_COLORS[invoice.payment_status] || "#374151";
  const paymentLabel =
    PAYMENT_STATUS_LABELS[invoice.payment_status] ||
    invoice.payment_status.toUpperCase();

  return (
    <>
      <style>{`
        .invoice-print-template {
          display: none;
        }

        @media print {
          * { box-sizing: border-box; }

          body * { visibility: hidden; }

          .invoice-print-template,
          .invoice-print-template * { visibility: visible; }

          .invoice-print-template {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
          }

          @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* ── Layout ─────────────────────────────────── */
          .pc { /* print container */
            width: 100%;
            max-width: 180mm;
            margin: 0 auto;
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 9pt;
            color: #1a1a1a;
            line-height: 1.5;
          }

          /* ── Header ─────────────────────────────────── */
          .ph {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 14px;
            margin-bottom: 20px;
            border-bottom: 3px solid #1a1a1a;
          }

          .ph-left { flex: 1; }

          .ph-logo {
            max-width: 140px;
            max-height: 50px;
            object-fit: contain;
            margin-bottom: 6px;
          }

          .ph-company-name {
            font-size: 13pt;
            font-weight: bold;
            letter-spacing: 0.02em;
            margin: 0 0 3px 0;
          }

          .ph-company-detail {
            font-size: 8pt;
            color: #555;
            margin: 1px 0;
          }

          .ph-right { text-align: right; }

          .ph-title {
            font-size: 28pt;
            font-weight: bold;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            line-height: 1;
            color: #1a1a1a;
            margin-bottom: 10px;
          }

          .ph-badge {
            display: inline-block;
            padding: 3px 10px;
            font-size: 7.5pt;
            font-weight: bold;
            letter-spacing: 0.1em;
            border: 1.5px solid currentColor;
          }

          /* ── Meta row ───────────────────────────────── */
          .pm {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 22px;
          }

          .pm-block { flex: 1; }

          .pm-label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #888;
            margin-bottom: 2px;
          }

          .pm-value {
            font-size: 9.5pt;
            font-weight: bold;
            color: #1a1a1a;
          }

          .pm-sub {
            font-size: 8pt;
            color: #555;
            margin-top: 1px;
          }

          /* ── Bill-to / Invoice-info ──────────────────── */
          .pbi {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;
            padding: 14px;
            background: #f7f7f7;
            border-left: 3px solid #1a1a1a;
          }

          .pbi-section { flex: 1; }

          .pbi-label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #888;
            margin-bottom: 5px;
          }

          .pbi-name {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 2px;
          }

          .pbi-detail {
            font-size: 8pt;
            color: #444;
            margin: 1px 0;
          }

          .pbi-divider {
            width: 1px;
            background: #ddd;
            margin: 0 8px;
          }

          .pbi-info-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 4px;
          }

          .pbi-info-label {
            font-size: 8pt;
            color: #888;
            white-space: nowrap;
          }

          .pbi-info-value {
            font-size: 8pt;
            font-weight: bold;
            text-align: right;
          }

          /* ── Section heading ────────────────────────── */
          .ps-heading {
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            font-weight: bold;
            color: #888;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #ddd;
          }

          /* ── Tables ─────────────────────────────────── */
          .pt {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
          }

          .pt thead tr {
            background: #1a1a1a;
            color: #fff;
          }

          .pt thead th {
            padding: 7px 10px;
            font-size: 7.5pt;
            font-weight: bold;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            border: none;
          }

          .pt tbody td {
            padding: 8px 10px;
            font-size: 8.5pt;
            border-bottom: 1px solid #ebebeb;
            vertical-align: top;
          }

          .pt tbody tr:last-child td { border-bottom: none; }

          .pt-item-name {
            font-weight: bold;
            font-size: 8.5pt;
          }

          .pt-item-desc {
            font-size: 7.5pt;
            color: #777;
            margin-top: 2px;
          }

          .pt-item-sku {
            font-size: 7pt;
            color: #aaa;
            font-family: 'Courier New', monospace;
            margin-top: 1px;
          }

          .text-right { text-align: right; }
          .text-center { text-align: center; }

          /* ── Totals ─────────────────────────────────── */
          .ptot-wrap {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 24px;
          }

          .ptot {
            width: 220px;
          }

          .ptot-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 8.5pt;
            border-bottom: 1px solid #ebebeb;
          }

          .ptot-row:last-child { border-bottom: none; }

          .ptot-label { color: #555; }
          .ptot-value { font-weight: bold; }

          .ptot-discount { color: #15803d; }

          .ptot-grand {
            margin-top: 8px;
            padding: 10px 12px;
            background: #1a1a1a;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .ptot-grand-label {
            font-size: 8pt;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .ptot-grand-value {
            font-size: 12pt;
            font-weight: bold;
          }

          .ptot-balance {
            margin-top: 6px;
            padding: 7px 12px;
            border: 1.5px solid currentColor;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .ptot-balance-label {
            font-size: 7.5pt;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }

          .ptot-balance-value {
            font-size: 10pt;
            font-weight: bold;
          }

          /* ── Notes ──────────────────────────────────── */
          .pnotes {
            margin-bottom: 24px;
            padding: 12px;
            background: #fffbeb;
            border: 1px solid #fde68a;
          }

          .pnotes-label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #92400e;
            font-weight: bold;
            margin-bottom: 5px;
          }

          .pnotes-text {
            font-size: 8.5pt;
            color: #451a03;
            white-space: pre-wrap;
          }

          /* ── Footer ─────────────────────────────────── */
          .pf {
            padding-top: 14px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .pf-msg {
            font-size: 8pt;
            color: #888;
          }

          .pf-msg strong {
            display: block;
            font-size: 9pt;
            color: #444;
            margin-bottom: 2px;
          }

          .pf-auto {
            font-size: 7pt;
            color: #bbb;
            text-align: right;
          }

          /* ── Page break helper ──────────────────────── */
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="invoice-print-template">
        <div className="pc">
          {/* ── Header ───────────────────────────────── */}
          <div className="ph">
            <div className="ph-left">
              {companyInfo?.logo && (
                <img src={companyInfo.logo} alt="Logo" className="ph-logo" />
              )}
              {/* <p className="ph-company-name">
                {companyInfo?.name || "Nama Perusahaan"}
              </p> */}
              {companyInfo?.address && (
                <p className="ph-company-detail">{companyInfo.address}</p>
              )}
              {companyInfo?.phone && (
                <p className="ph-company-detail">Telp: {companyInfo.phone}</p>
              )}
              {companyInfo?.email && (
                <p className="ph-company-detail">{companyInfo.email}</p>
              )}
            </div>

            <div className="ph-right">
              <div className="ph-title">Faktur</div>
              <div
                className="ph-badge"
                style={{ color: paymentColor, borderColor: paymentColor }}
              >
                {paymentLabel}
              </div>
            </div>
          </div>

          {/* ── Bill-to + Invoice info ────────────────── */}
          <div className="pbi">
            <div className="pbi-section">
              <div className="pbi-label">Tagihan Kepada</div>
              <div className="pbi-name">{invoice.customer?.name || "—"}</div>
              {invoice.customer?.address && (
                <div className="pbi-detail">{invoice.customer.address}</div>
              )}
              {invoice.customer?.phone && (
                <div className="pbi-detail">☎ {invoice.customer.phone}</div>
              )}
              {invoice.customer?.email && (
                <div className="pbi-detail">✉ {invoice.customer.email}</div>
              )}
            </div>

            <div className="pbi-divider" />

            <div className="pbi-section" style={{ minWidth: "130px" }}>
              <div className="pbi-label">Detail Faktur</div>
              {[
                ["No. Faktur", invoice.invoice_number],
                [
                  "Tanggal",
                  format(new Date(invoice.invoice_date), "dd MMM yyyy", {
                    locale: localeId,
                  }),
                ],
                invoice.due_date
                  ? [
                      "Jatuh Tempo",
                      format(new Date(invoice.due_date), "dd MMM yyyy", {
                        locale: localeId,
                      }),
                    ]
                  : null,
                [
                  "Status",
                  STATUS_LABELS[invoice.status] || invoice.status.toUpperCase(),
                ],
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div className="pbi-info-row" key={label as string}>
                    <span className="pbi-info-label">{label}</span>
                    <span className="pbi-info-value">{value}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* ── Services table ───────────────────────── */}
          {services.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <div className="ps-heading">Layanan</div>
              <table className="pt">
                <thead>
                  <tr>
                    <th style={{ width: "45%" }}>Deskripsi</th>
                    <th className="text-right">Biaya Layanan</th>
                    <th className="text-right">Biaya Suku Cadang</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, i) => (
                    <tr key={i}>
                      <td>
                        <div className="pt-item-name">
                          {service.service_title || service.title || "—"}
                        </div>
                        {(service.service_description ||
                          service.description) && (
                          <div className="pt-item-desc">
                            {service.service_description || service.description}
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        {formatCurrency(service.service_cost)}
                      </td>
                      <td className="text-right">
                        {formatCurrency(service.parts_cost)}
                      </td>
                      <td className="text-right">
                        {formatCurrency(service.total_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Items table ──────────────────────────── */}
          {items.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <div className="ps-heading">Produk</div>
              <table className="pt">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Produk</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Harga Satuan</th>
                    <th className="text-right">Diskon</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <div className="pt-item-name">
                          {item.product?.name || item.product_name || "—"}
                        </div>
                        {item.product_sku && (
                          <div className="pt-item-sku">
                            SKU: {item.product_sku}
                          </div>
                        )}
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="text-right">
                        {(item.discount || 0) > 0
                          ? formatCurrency(item.discount!)
                          : "—"}
                      </td>
                      <td className="text-right">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Totals ───────────────────────────────── */}
          <div className="ptot-wrap">
            <div className="ptot">
              {/* Subtotal */}
              <div className="ptot-row">
                <span className="ptot-label">Subtotal</span>
                <span className="ptot-value">
                  {formatCurrency(invoice.subtotal ?? invoice.grand_total)}
                </span>
              </div>

              {/* Discount */}
              {(invoice.discount_amount || 0) > 0 && (
                <div className="ptot-row">
                  <span className="ptot-label ptot-discount">Diskon</span>
                  <span className="ptot-value ptot-discount">
                    − {formatCurrency(invoice.discount_amount!)}
                  </span>
                </div>
              )}

              {/* Tax */}
              {(invoice.tax_amount || 0) > 0 && (
                <div className="ptot-row">
                  <span className="ptot-label">PPN</span>
                  <span className="ptot-value">
                    {formatCurrency(invoice.tax_amount!)}
                  </span>
                </div>
              )}

              {/* Grand total */}
              <div className="ptot-grand">
                <span className="ptot-grand-label">Total</span>
                <span className="ptot-grand-value">
                  {formatCurrency(invoice.grand_total)}
                </span>
              </div>

              {/* Paid + remaining */}
              {(invoice.amount_paid || 0) > 0 && (
                <>
                  <div className="ptot-row" style={{ marginTop: "6px" }}>
                    <span className="ptot-label">Sudah Dibayar</span>
                    <span className="ptot-value">
                      {formatCurrency(invoice.amount_paid!)}
                    </span>
                  </div>

                  <div
                    className="ptot-balance"
                    style={{
                      color: remainingBalance <= 0 ? "#15803d" : paymentColor,
                      borderColor:
                        remainingBalance <= 0 ? "#15803d" : paymentColor,
                    }}
                  >
                    <span className="ptot-balance-label">Sisa Tagihan</span>
                    <span className="ptot-balance-value">
                      {remainingBalance <= 0
                        ? "LUNAS"
                        : formatCurrency(remainingBalance)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Notes ────────────────────────────────── */}
          {invoice.notes && (
            <div className="pnotes">
              <div className="pnotes-label">Catatan</div>
              <div className="pnotes-text">{invoice.notes}</div>
            </div>
          )}

          {/* ── Footer ───────────────────────────────── */}
          <div className="pf">
            <div className="pf-msg">
              <strong>Terima kasih atas kepercayaan Anda!</strong>
              Harap hubungi kami jika ada pertanyaan mengenai faktur ini.
            </div>
            <div className="pf-auto">
              Dicetak otomatis ·{" "}
              {format(new Date(), "dd MMM yyyy HH:mm", { locale: localeId })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
