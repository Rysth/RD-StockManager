// Generador e impresor de ticket 80mm reutilizable (POS y detalle de ventas).
import type { PaymentMethod } from "../types/inventory";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export interface TicketLine {
  label: string;
  quantity: number;
  unit_price: number;
}

export interface TicketData {
  businessName: string;
  businessSlogan?: string;
  date: Date;
  saleId?: number;
  saleCode?: string;
  customerName: string;
  lines: TicketLine[];
  shippingCost: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashOnDelivery: boolean;
}

export function buildTicketHtml(data: TicketData): string {
  const dateStr = data.date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = data.date.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const itemsTotal = data.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  const rows = data.lines
    .map(
      (i) => `
      <tr>
        <td>${escapeHtml(i.label)}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${money(i.unit_price)}</td>
        <td style="text-align:right">${money(i.unit_price * i.quantity)}</td>
      </tr>`,
    )
    .join("");

  const shippingRow =
    data.shippingCost > 0
      ? `<div class="row"><span class="label">Subtotal</span><span>${money(itemsTotal)}</span></div>
         <div class="row"><span class="label">Envío</span><span>${money(data.shippingCost)}</span></div>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:80mm;min-width:80mm;max-width:80mm;background:#fff}
  body{font-family:'Courier New',Courier,monospace;font-size:11px;padding:3mm;overflow:hidden}
  h1{font-size:16px;text-align:center;letter-spacing:3px;font-weight:bold}
  .sub{font-size:9px;text-align:center;color:#555;margin-bottom:5px}
  hr.dash{border:none;border-top:1px dashed #000;margin:4px 0}
  hr.solid{border:none;border-top:1px solid #000;margin:4px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .label{color:#555}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;border-bottom:1px solid #000;padding-bottom:3px;text-align:left}
  th:nth-child(n+2),td:nth-child(n+2){text-align:center}
  th:nth-child(3),td:nth-child(3),th:nth-child(4),td:nth-child(4){text-align:right}
  td{padding:2px 0;vertical-align:top}
  .total{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin-top:3px}
  .cod{text-align:center;font-weight:bold;color:#b45309;margin:4px 0}
  .footer{text-align:center;margin-top:8px;font-size:10px}
  @media print{html,body{width:80mm;min-width:80mm;max-width:80mm}@page{size:80mm 200mm;margin:0}}
</style></head>
<body>
  <h1>${escapeHtml(data.businessName.toUpperCase())}</h1>
  ${data.businessSlogan ? `<p class="sub">${escapeHtml(data.businessSlogan)}</p>` : ""}
  <hr class="solid">
  ${(data.saleCode || data.saleId) ? `<div class="row"><span class="label">Venta</span><span>${data.saleCode ?? `#${data.saleId}`}</span></div>` : ""}
  <div class="row"><span class="label">Fecha</span><span>${dateStr} ${timeStr}</span></div>
  <div class="row"><span class="label">Cliente</span><span>${escapeHtml(data.customerName)}</span></div>
  <hr class="dash">
  <table>
    <thead><tr><th>Producto</th><th>Cant</th><th>P.Unit</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr class="dash">
  ${shippingRow}
  <div class="total"><span>TOTAL</span><span>${money(data.total)}</span></div>
  <hr class="dash">
  <div class="row">
    <span class="label">Método de pago</span>
    <span>${data.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}</span>
  </div>
  ${data.cashOnDelivery ? '<p class="cod">PAGO CONTRA ENTREGA</p>' : ""}
  <hr class="solid">
  <p class="footer">¡Gracias por su compra!</p>
</body></html>`;
}

// Abre una ventana de impresión con el ticket. Devuelve false si el navegador la bloqueó.
export function printTicket(data: TicketData): boolean {
  const win = window.open("", "_blank", "width=360,height=640,toolbar=0,menubar=0,location=0");
  if (!win) return false;
  win.document.write(buildTicketHtml(data));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
