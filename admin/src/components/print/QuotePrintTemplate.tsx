import { forwardRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Quotation } from "@/stores/quotationStore";
import logo from "@/assets/rysth_logo.png";
import { DEFAULT_TERMS_CONDITIONS } from "@/constants/terms";
import "@/styles/print.css";

interface Business {
  name?: string;
  logo_url?: string | null;
  whatsapp?: string | null;
}

interface QuotePrintTemplateProps {
  quotation: Quotation;
  business: Business | null;
}

const QuotePrintTemplate = forwardRef<HTMLDivElement, QuotePrintTemplateProps>(
  ({ quotation, business }, ref) => {
    const fmt = (value: number) =>
      new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(value);

    const fmtDate = (dateStr: string) => {
      try {
        return format(new Date(dateStr), "dd/MMMM/yyyy", { locale: es });
      } catch {
        return dateStr;
      }
    };

    const logoSrc = business?.logo_url || (logo as string);
    const businessName = business?.name || "StockManager";
    const businessPhone = business?.whatsapp || "";

    return (
      <div ref={ref} className="quote-print-template">
        {/* Header */}
        <div className="quote-header">
          <div className="quote-header-left">
            <img src={logoSrc} alt={businessName} className="quote-logo" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="quote-business-name">{businessName}</div>
            </div>
          </div>
          <div className="quote-header-right">
            <h1 className="quote-title">COTIZACIÓN</h1>
            <p className="quote-subtitle">{quotation.quotation_number}</p>
          </div>
        </div>

        {/* Info Row */}
        <div className="quote-info-row">
          <div className="quote-info-left">
            <div className="quote-section" style={{ marginBottom: 0 }}>
              <div className="quote-section-header">
                <span>De</span>
              </div>
              <div className="quote-client-info">
                <div className="quote-info-item">
                  <span className="quote-info-label">Nombre:</span>
                  <span className="quote-info-value">{businessName}</span>
                </div>
                {businessPhone && (
                  <div className="quote-info-item">
                    <span className="quote-info-label">Celular:</span>
                    <span className="quote-info-value quote-link">{businessPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="quote-info-right">
            <div className="quote-section" style={{ marginBottom: 0 }}>
              <div className="quote-section-header">
                <span>Detalles</span>
              </div>
              <div className="quote-client-info">
                <div className="quote-info-item">
                  <span className="quote-info-label">Fecha:</span>
                  <span className="quote-info-value">{fmtDate(quotation.created_at)}</span>
                </div>
                <div className="quote-info-item">
                  <span className="quote-info-label">Cotización #:</span>
                  <span className="quote-info-value">{quotation.quotation_number}</span>
                </div>
                {quotation.valid_until && (
                  <div className="quote-info-item">
                    <span className="quote-info-label">Válida hasta:</span>
                    <span className="quote-info-value">{fmtDate(quotation.valid_until)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Client Section */}
        <div className="quote-section">
          <div className="quote-section-header">
            <span>Documento Para</span>
          </div>
          <div className="quote-client-info">
            <div className="quote-client-row">
              <div className="quote-info-item">
                <span className="quote-info-label">Nombre:</span>
                <span className="quote-info-value">{quotation.customer_name || "N/A"}</span>
              </div>
              {(quotation.project_name || quotation.customer_company) && (
                <div className="quote-info-item">
                  <span className="quote-info-label">Negocio:</span>
                  <span className="quote-info-value">
                    {quotation.project_name || quotation.customer_company || "N/A"}
                  </span>
                </div>
              )}
            </div>
            {quotation.customer_phone && (
              <div className="quote-info-item">
                <span className="quote-info-label">Celular:</span>
                <span className="quote-info-value quote-link">{quotation.customer_phone}</span>
              </div>
            )}
            {quotation.customer_email && (
              <div className="quote-info-item">
                <span className="quote-info-label">Email:</span>
                <span className="quote-info-value">{quotation.customer_email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="quote-section">
          <div className="quote-section-header">
            <span>Detalle de la Cotización</span>
          </div>
          <table className="quote-table">
            <thead>
              <tr>
                <th className="col-desc">Descripción</th>
                <th className="col-qty">Cantidad</th>
                <th className="col-price">P. Unitario</th>
                <th className="col-subtotal">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.quotation_items?.map((item, index) => (
                <tr key={item.id ?? index}>
                  <td className="col-desc">
                    <div style={{ fontWeight: 500 }}>{item.description}</div>
                  </td>
                  <td className="col-qty">{Number(item.quantity)}</td>
                  <td className="col-price">{fmt(Number(item.unit_price))}</td>
                  <td className="col-subtotal">
                    {fmt(Number(item.total ?? Number(item.quantity) * Number(item.unit_price)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="quote-totals">
            <div>
              <div className="quote-total-row">
                <span className="quote-total-label">Subtotal</span>
                <span className="quote-total-value">{fmt(Number(quotation.subtotal))}</span>
              </div>
              <div className="quote-total-row">
                <span className="quote-total-label">IVA ({quotation.tax_rate}%)</span>
                <span className="quote-total-value">{fmt(Number(quotation.tax_amount))}</span>
              </div>
              <div className="quote-total-row quote-total-final">
                <span className="quote-total-label">TOTAL</span>
                <span className="quote-total-value">{fmt(Number(quotation.total))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="quote-section">
          <div className="quote-section-header">
            <span>Términos y Condiciones</span>
          </div>
          <div className="quote-terms">
            <p>{DEFAULT_TERMS_CONDITIONS}</p>
          </div>
        </div>

        {/* Notes */}
        {quotation.notes && (
          <div className="quote-section">
            <div className="quote-section-header">
              <span>Notas</span>
            </div>
            <div className="quote-notes">
              <p>{quotation.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="quote-footer">
          <p>Gracias por su preferencia</p>
          <div className="quote-footer-powered">
            <p>
              Powered by <strong>StockManager</strong>
            </p>
            <p className="quote-footer-website">www.rysthdesign.com</p>
          </div>
        </div>
      </div>
    );
  },
);

QuotePrintTemplate.displayName = "QuotePrintTemplate";

export default QuotePrintTemplate;
