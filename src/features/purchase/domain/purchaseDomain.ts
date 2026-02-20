import type { Order, OrderItem, PurchaseEdit, PurchasePlanDbRow, PurchasePlanRow } from "@/features/admin/types";

export interface CatalogMeta {
  hi: string;
  category: string;
}

export const round2 = (value: number) => Number(value.toFixed(2));
export const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toPurchaseKey = (itemCode: string | null | undefined, itemEn: string) =>
  itemCode && itemCode.trim() ? itemCode.trim() : itemEn.trim();

export const aggregateOrdersForPurchase = (
  orders: Order[],
  catalogCodeByName: Map<string, string>,
): PurchasePlanRow[] => {
  const rows = new Map<string, PurchasePlanRow>();
  orders.forEach((order) => {
    const items = (order.items || []) as OrderItem[];
    items.forEach((item) => {
      const itemEn = item.en.trim();
      const itemQty = Math.max(0, round2(toSafeNumber(item.qty, 0)));
      const itemCode = item.code || catalogCodeByName.get(itemEn) || itemEn;
      const key = toPurchaseKey(itemCode, itemEn);
      const existing = rows.get(key);
      if (!existing) {
        rows.set(key, {
          item_code: itemCode,
          item_en: itemEn,
          item_hi: item.hi || null,
          category: item.category || null,
          ordered_qty: itemQty,
          adjustment_qty: 0,
          final_qty: itemQty,
          purchased_qty: 0,
          pack_size: 0,
          pack_count: 0,
          unit_price: 0,
          line_total: 0,
          variance_qty: itemQty === 0 ? 0 : -itemQty,
          vendor_name: null,
          purchase_status: "draft",
          finalized_at: null,
          finalized_by: null,
          notes: null,
          source_orders: [
            {
              order_ref: order.order_ref,
              restaurant_name: order.restaurant_name,
              qty: itemQty,
            },
          ],
        });
      } else {
        existing.ordered_qty = round2(existing.ordered_qty + itemQty);
        existing.final_qty = round2(existing.ordered_qty + existing.adjustment_qty);
        existing.variance_qty = round2(existing.purchased_qty - existing.final_qty);
        existing.source_orders = [
          ...(existing.source_orders || []),
          {
            order_ref: order.order_ref,
            restaurant_name: order.restaurant_name,
            qty: itemQty,
          },
        ];
        rows.set(key, existing);
      }
    });
  });

  return Array.from(rows.values()).sort((a, b) => a.item_en.localeCompare(b.item_en));
};

export const mergePurchaseRows = ({
  aggregatedRows,
  persistedRows,
  purchaseEdits,
  catalogMetaMap,
}: {
  aggregatedRows: PurchasePlanRow[];
  persistedRows: PurchasePlanDbRow[];
  purchaseEdits: Record<string, PurchaseEdit>;
  catalogMetaMap: Map<string, CatalogMeta>;
}) => {
  const persistedByKey = new Map<string, PurchasePlanDbRow>();
  persistedRows.forEach((row) => persistedByKey.set(toPurchaseKey(row.item_code, row.item_en), row));
  const aggregatedByKey = new Map<string, PurchasePlanRow>();
  aggregatedRows.forEach((row) => aggregatedByKey.set(toPurchaseKey(row.item_code, row.item_en), row));
  const allKeys = new Set<string>([...Array.from(aggregatedByKey.keys()), ...Array.from(persistedByKey.keys())]);

  const rows: PurchasePlanRow[] = [];
  allKeys.forEach((key) => {
    const live = aggregatedByKey.get(key);
    const saved = persistedByKey.get(key);
    const edit = purchaseEdits[key] || {};

    const orderedQty = live ? toSafeNumber(live.ordered_qty, 0) : 0;
    const adjustmentQty = edit.adjustment_qty ?? (saved ? toSafeNumber(saved.adjustment_qty, live?.adjustment_qty ?? 0) : 0);
    const finalQty = round2(orderedQty + adjustmentQty);
    const packSize = Math.max(0, edit.pack_size ?? toSafeNumber(saved?.pack_size, 0));
    const packCount = Math.max(0, edit.pack_count ?? toSafeNumber(saved?.pack_count, 0));
    const purchasedFromPack = packSize > 0 && packCount > 0 ? round2(packSize * packCount) : undefined;
    const hasAnyEdit = Object.keys(edit).length > 0;
    const useFinalAsDefaultPurchased =
      !hasAnyEdit &&
      saved &&
      toSafeNumber(saved.purchased_qty, 0) === 0 &&
      toSafeNumber(saved.unit_price, 0) === 0 &&
      finalQty > 0;
    const purchasedQtyBase = Math.max(
      0,
      round2(
        edit.purchased_qty ??
          (useFinalAsDefaultPurchased
            ? finalQty
            : toSafeNumber(saved?.purchased_qty, 0)
          ),
      ),
    );
    const purchasedQty = round2(purchasedFromPack ?? purchasedQtyBase);
    const unitPrice = round2(Math.max(0, edit.unit_price ?? toSafeNumber(saved?.unit_price, 0)));
    const lineTotal = round2(purchasedQty * unitPrice);
    const varianceQty = round2(purchasedQty - finalQty);

    rows.push({
      item_code: live?.item_code || saved?.item_code || key,
      item_en: live?.item_en || saved?.item_en || key,
      item_hi:
        live?.item_hi ||
        saved?.item_hi ||
        catalogMetaMap.get(live?.item_code || saved?.item_code || key)?.hi ||
        catalogMetaMap.get(live?.item_en || saved?.item_en || key)?.hi ||
        null,
      category:
        live?.category ||
        saved?.category ||
        catalogMetaMap.get(live?.item_code || saved?.item_code || key)?.category ||
        catalogMetaMap.get(live?.item_en || saved?.item_en || key)?.category ||
        null,
      ordered_qty: round2(orderedQty),
      adjustment_qty: round2(adjustmentQty),
      final_qty: finalQty,
      purchased_qty: purchasedQty,
      pack_size: round2(packSize),
      pack_count: round2(packCount),
      unit_price: unitPrice,
      line_total: lineTotal,
      variance_qty: varianceQty,
      vendor_name: edit.vendor_name ?? saved?.vendor_name ?? null,
      purchase_status: (saved?.purchase_status === "finalized" ? "finalized" : "draft"),
      finalized_at: saved?.finalized_at ?? null,
      finalized_by: saved?.finalized_by ?? null,
      notes: edit.notes ?? saved?.notes ?? null,
      source_orders: live?.source_orders || (saved?.source_orders as PurchasePlanRow["source_orders"]) || null,
    });
  });

  return { rows: rows.sort((a, b) => a.item_en.localeCompare(b.item_en)), persistedByKey };
};

export const computePurchaseTotals = (rows: PurchasePlanRow[]) => {
  let requiredQty = 0;
  let purchasedQty = 0;
  let spend = 0;
  let shortageCount = 0;
  let extraCount = 0;
  rows.forEach((row) => {
    requiredQty += row.final_qty;
    purchasedQty += row.purchased_qty;
    spend += row.line_total;
    if (row.variance_qty < 0) shortageCount += 1;
    if (row.variance_qty > 0) extraCount += 1;
  });

  return {
    requiredQty: round2(requiredQty),
    purchasedQty: round2(purchasedQty),
    spend: round2(spend),
    shortageCount,
    extraCount,
  };
};

export const hasNegativeFinalQty = (row: Pick<PurchasePlanRow, "final_qty">) => row.final_qty < 0;

export const computeStockDeltaFromVariance = (
  purchaseRows: PurchasePlanRow[],
  persistedByKey: Map<string, PurchasePlanDbRow>,
) => {
  const stockDeltaByCode = new Map<string, { item_en: string; delta: number }>();
  purchaseRows.forEach((row) => {
    const key = toPurchaseKey(row.item_code, row.item_en);
    const previous = persistedByKey.get(key);
    const previousPositive = Math.max(0, toSafeNumber(previous?.variance_qty, 0));
    const nextPositive = Math.max(0, row.variance_qty);
    const delta = round2(nextPositive - previousPositive);
    if (delta <= 0) return;
    const existing = stockDeltaByCode.get(row.item_code);
    if (existing) {
      existing.delta = round2(existing.delta + delta);
      stockDeltaByCode.set(row.item_code, existing);
    } else {
      stockDeltaByCode.set(row.item_code, { item_en: row.item_en, delta });
    }
  });
  return stockDeltaByCode;
};
