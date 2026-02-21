import { formatIndiaDateTime } from "@/lib/datetime";
import type { Order, OrderItem } from "@/features/admin/types";

export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-");

export const getRestaurantOrderLink = (slug: string) => `${window.location.origin}/order?r=${slug}`;
export const getAdminLoginLink = () => `${window.location.origin}/admin/login`;
export const getAdminPanelLink = () => `${window.location.origin}/admin`;
export const getPurchaseLink = () => `${window.location.origin}/purchase`;
export const getStockLink = () => `${window.location.origin}/admin?view=warehouse`;
export const getCurrentPageLink = () => window.location.href;
export const getRestaurantPortalLoginLink = (slug: string) => `${window.location.origin}/restaurant/login?r=${slug}`;

export const copyTextToClipboard = async (value: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fallback below handles non-secure HTTP contexts and older browsers.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

export const getQrUrl = (link: string, size = 320) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`;
export const getRestaurantQrUrl = (slug: string, size = 320) => getQrUrl(getRestaurantOrderLink(slug), size);

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const round2 = (value: number) => Number(value.toFixed(2));
export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const toPurchaseKey = (itemCode: string | null | undefined, itemEn: string) =>
  itemCode && itemCode.trim() ? itemCode.trim() : itemEn.trim();

export const buildPrintableOrderSection = (order: Order) => {
  const items = (order.items || []) as OrderItem[];
  const notes = order.notes ? escapeHtml(order.notes) : "None";
  const itemsRows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.en)}</td>
          <td>${escapeHtml(item.hi)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td style="text-align:right">${item.qty} kg</td>
        </tr>
      `,
    )
    .join("");

  return `
    <section class="order-block">
    <h1>Order Slip - ${escapeHtml(order.restaurant_name)}</h1>
    <div class="meta">
      <p><strong>Ref:</strong> ${escapeHtml(order.order_ref)}</p>
      <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
      <p><strong>Order Date:</strong> ${escapeHtml(order.order_date)}</p>
      <p><strong>Delivery Date:</strong> ${escapeHtml(order.delivery_date)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(order.contact_name)} (${escapeHtml(order.contact_phone)})</p>
      <p><strong>Placed Time:</strong> ${escapeHtml(formatIndiaDateTime(order.created_at))}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Hindi</th>
          <th>Category</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
    <p class="notes"><strong>Notes:</strong> ${notes}</p>
    </section>`;
};

export const buildPrintableDoc = (content: string, title: string) => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      .meta { margin-bottom: 14px; font-size: 13px; }
      .meta p { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
      th, td { border: 1px solid #bbb; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; }
      .notes { margin-top: 12px; font-size: 13px; }
      .order-block { break-after: page; page-break-after: always; margin-bottom: 20px; }
      .order-block:last-child { break-after: auto; page-break-after: auto; }
    </style>
  </head>
  <body>${content}</body>
</html>`;
};
