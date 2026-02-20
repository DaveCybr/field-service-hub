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
  quantity: number;
  unit_price: number;
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

export function InvoicePrintTemplate({
  invoice,
  services,
  items,
  companyInfo,
}: InvoicePrintTemplateProps) {
  return (
    <>
      <style>{`
        .invoice-print-template {
          display: none;
        }
        
        @media print {
          body * { visibility: hidden; }
          
          .invoice-print-template,
          .invoice-print-template * { visibility: visible; }
          
          .invoice-print-template {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          @page { size: A4; margin: 1cm; }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            font-family: Arial, sans-serif;
            font-size: 12pt;
            color: #000;
          }
          
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #000;
          }
          
          .print-logo { max-width: 200px; max-height: 80px; }
          .print-title { font-size: 32pt; font-weight: bold; text-align: right; }
          .print-section { margin-bottom: 20px; }
          
          .print-section-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .print-table th {
            background-color: #f0f0f0;
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
            font-weight: bold;
          }
          
          .print-table td {
            padding: 10px;
            border: 1px solid #ddd;
          }
          
          .print-table tr:nth-child(even) { background-color: #f9f9f9; }
          
          .print-totals { margin-left: auto; width: 300px; }
          
          .print-totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
          }
          
          .print-grand-total {
            font-size: 14pt;
            font-weight: bold;
            background-color: #f0f0f0;
            padding: 12px;
            margin-top: 10px;
          }
          
          .print-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10pt;
            color: #666;
          }
        }
      `}</style>

      <div className="invoice-print-template">
        <div className="print-container">
          {/* Header */}
          <div className="print-header">
            <div>
              {companyInfo?.logo && (
                <img
                  src={companyInfo.logo}
                  alt="Logo Perusahaan"
                  className="print-logo"
                />
              )}
              <h3
                style={{
                  fontSize: "16pt",
                  fontWeight: "bold",
                  marginTop: "10px",
                }}
              >
                {companyInfo?.name || "Nama Perusahaan"}
              </h3>
              {companyInfo?.address && <p>{companyInfo.address}</p>}
              {companyInfo?.phone && <p>Telp: {companyInfo.phone}</p>}
              {companyInfo?.email && <p>Email: {companyInfo.email}</p>}
            </div>
            <div className="print-title">FAKTUR</div>
          </div>

          {/* Info Faktur */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px",
            }}
          >
            <div className="print-section">
              <div className="print-section-title">Tagihan Kepada:</div>
              <p style={{ fontWeight: "bold", fontSize: "14pt" }}>
                {invoice.customer?.name}
              </p>
              {invoice.customer?.address && <p>{invoice.customer.address}</p>}
              {invoice.customer?.phone && <p>Telp: {invoice.customer.phone}</p>}
              {invoice.customer?.email && (
                <p>Email: {invoice.customer.email}</p>
              )}
            </div>

            <div className="print-section" style={{ textAlign: "right" }}>
              <p>
                <strong>No. Faktur:</strong> {invoice.invoice_number}
              </p>
              <p>
                <strong>Tanggal:</strong>{" "}
                {format(new Date(invoice.invoice_date), "dd MMMM yyyy", {
                  locale: localeId,
                })}
              </p>
              {invoice.due_date && (
                <p>
                  <strong>Jatuh Tempo:</strong>{" "}
                  {format(new Date(invoice.due_date), "dd MMMM yyyy", {
                    locale: localeId,
                  })}
                </p>
              )}
              <p>
                <strong>Status:</strong>{" "}
                {STATUS_LABELS[invoice.status] || invoice.status.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Tabel Layanan */}
          {services.length > 0 && (
            <div className="print-section">
              <div className="print-section-title">Layanan</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Deskripsi</th>
                    <th style={{ textAlign: "right" }}>Biaya Layanan</th>
                    <th style={{ textAlign: "right" }}>Biaya Suku Cadang</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, index) => (
                    <tr key={index}>
                      <td>
                        <strong>
                          {service.service_title || service.title}
                        </strong>
                        {(service.service_description ||
                          service.description) && (
                          <div
                            style={{
                              fontSize: "10pt",
                              color: "#666",
                              marginTop: "4px",
                            }}
                          >
                            {service.service_description || service.description}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(service.service_cost)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(service.parts_cost)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(service.total_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabel Produk */}
          {items.length > 0 && (
            <div className="print-section">
              <div className="print-section-title">Produk</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th style={{ textAlign: "center" }}>Jumlah</th>
                    <th style={{ textAlign: "right" }}>Harga Satuan</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product?.name || "Produk"}</td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ringkasan Total */}
          <div className="print-totals">
            <div className="print-totals-row">
              <span>Subtotal:</span>
              <span>
                {formatCurrency(invoice.subtotal || invoice.grand_total)}
              </span>
            </div>

            {(invoice.discount_amount || 0) > 0 && (
              <div className="print-totals-row">
                <span>Diskon:</span>
                <span>-{formatCurrency(invoice.discount_amount || 0)}</span>
              </div>
            )}

            {(invoice.tax_amount || 0) > 0 && (
              <div className="print-totals-row">
                <span>Pajak (PPN):</span>
                <span>{formatCurrency(invoice.tax_amount || 0)}</span>
              </div>
            )}

            <div
              className="print-grand-total"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>TOTAL:</span>
              <span>{formatCurrency(invoice.grand_total)}</span>
            </div>

            {(invoice.amount_paid || 0) > 0 && (
              <>
                <div className="print-totals-row">
                  <span>Sudah Dibayar:</span>
                  <span>{formatCurrency(invoice.amount_paid || 0)}</span>
                </div>
                <div
                  className="print-totals-row"
                  style={{ fontWeight: "bold" }}
                >
                  <span>Sisa Tagihan:</span>
                  <span>
                    {formatCurrency(
                      invoice.grand_total - (invoice.amount_paid || 0),
                    )}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Catatan */}
          {invoice.notes && (
            <div className="print-section" style={{ marginTop: "30px" }}>
              <div className="print-section-title">Catatan:</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="print-footer">
            <p>Terima kasih atas kepercayaan Anda!</p>
            <p>
              Dokumen ini dicetak secara otomatis oleh sistem dan tidak
              memerlukan tanda tangan.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
