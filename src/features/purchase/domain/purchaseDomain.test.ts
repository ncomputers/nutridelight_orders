import { describe, expect, it } from "vitest";
import {
  aggregateOrdersForPurchase,
  computePurchaseTotals,
  computeStockDeltaFromVariance,
  hasNegativeFinalQty,
  mergePurchaseRows,
} from "@/features/purchase/domain/purchaseDomain";
import type { Order, PurchasePlanDbRow } from "@/features/admin/types";

describe("purchaseDomain", () => {
  it("aggregates confirmed order items", () => {
    const orders = [
      {
        id: "1",
        order_ref: "ORD-1",
        restaurant_name: "R1",
        contact_name: "",
        contact_phone: "",
        order_date: "2026-01-01",
        delivery_date: "2026-01-02",
        status: "confirmed",
        notes: null,
        created_at: "",
        items: [{ code: "VEG_TOMATO", en: "Tomato", hi: "टमाटर", qty: 2, category: "vegetables" }],
      },
      {
        id: "2",
        order_ref: "ORD-2",
        restaurant_name: "R2",
        contact_name: "",
        contact_phone: "",
        order_date: "2026-01-01",
        delivery_date: "2026-01-02",
        status: "confirmed",
        notes: null,
        created_at: "",
        items: [{ code: "VEG_TOMATO", en: "Tomato", hi: "टमाटर", qty: 1.5, category: "vegetables" }],
      },
    ] as Order[];
    const rows = aggregateOrdersForPurchase(orders, new Map());
    expect(rows).toHaveLength(1);
    expect(rows[0].ordered_qty).toBe(3.5);
  });

  it("merges persisted and live rows with edits", () => {
    const aggregatedRows = aggregateOrdersForPurchase(
      [{
        id: "1",
        order_ref: "ORD-1",
        restaurant_name: "R1",
        contact_name: "",
        contact_phone: "",
        order_date: "2026-01-01",
        delivery_date: "2026-01-02",
        status: "confirmed",
        notes: null,
        created_at: "",
        items: [{ code: "VEG_TOMATO", en: "Tomato", hi: "टमाटर", qty: 2, category: "vegetables" }],
      }] as Order[],
      new Map(),
    );
    const persistedRows = [{
      item_code: "VEG_TOMATO",
      item_en: "Tomato",
      item_hi: "टमाटर",
      category: "vegetables",
      ordered_qty: 2,
      adjustment_qty: 0,
      final_qty: 2,
      purchased_qty: 1,
      pack_size: 0,
      pack_count: 0,
      unit_price: 10,
      line_total: 10,
      variance_qty: -1,
      vendor_name: "A",
      purchase_status: "draft",
      finalized_at: null,
      finalized_by: null,
      notes: null,
      source_orders: null,
    }] as PurchasePlanDbRow[];
    const merged = mergePurchaseRows({
      aggregatedRows,
      persistedRows,
      purchaseEdits: { VEG_TOMATO: { purchased_qty: 3, unit_price: 20 } },
      catalogMetaMap: new Map(),
    });
    expect(merged.rows[0].purchased_qty).toBe(3);
    expect(merged.rows[0].line_total).toBe(60);
  });

  it("clamps negative order qty during aggregation", () => {
    const rows = aggregateOrdersForPurchase(
      [{
        id: "1",
        order_ref: "ORD-NEG",
        restaurant_name: "R1",
        contact_name: "",
        contact_phone: "",
        order_date: "2026-01-01",
        delivery_date: "2026-01-02",
        status: "confirmed",
        notes: null,
        created_at: "",
        items: [{ code: "VEG_TOMATO", en: "Tomato", hi: "टमाटर", qty: -4, category: "vegetables" }],
      }] as Order[],
      new Map(),
    );
    expect(rows[0].ordered_qty).toBe(0);
    expect(rows[0].final_qty).toBe(0);
    expect(rows[0].variance_qty).toBe(0);
  });

  it("keeps negative final qty when adjustment over-reduces", () => {
    const merged = mergePurchaseRows({
      aggregatedRows: [{
        item_code: "VEG_TOMATO",
        item_en: "Tomato",
        item_hi: "टमाटर",
        category: "vegetables",
        ordered_qty: 2,
        adjustment_qty: 0,
        final_qty: 2,
        purchased_qty: 0,
        pack_size: 0,
        pack_count: 0,
        unit_price: 0,
        line_total: 0,
        variance_qty: -2,
        vendor_name: null,
        purchase_status: "draft",
        finalized_at: null,
        finalized_by: null,
        notes: null,
        source_orders: null,
      }],
      persistedRows: [],
      purchaseEdits: { VEG_TOMATO: { adjustment_qty: -5 } },
      catalogMetaMap: new Map(),
    });
    expect(merged.rows[0].final_qty).toBe(-3);
    expect(hasNegativeFinalQty(merged.rows[0])).toBe(true);
  });

  it("defaults purchased qty to final qty for untouched zero-saved row", () => {
    const merged = mergePurchaseRows({
      aggregatedRows: [{
        item_code: "VEG_TOMATO",
        item_en: "Tomato",
        item_hi: "टमाटर",
        category: "vegetables",
        ordered_qty: 3,
        adjustment_qty: 0,
        final_qty: 3,
        purchased_qty: 0,
        pack_size: 0,
        pack_count: 0,
        unit_price: 0,
        line_total: 0,
        variance_qty: -3,
        vendor_name: null,
        purchase_status: "draft",
        finalized_at: null,
        finalized_by: null,
        notes: null,
        source_orders: null,
      }],
      persistedRows: [{
        item_code: "VEG_TOMATO",
        item_en: "Tomato",
        item_hi: "टमाटर",
        category: "vegetables",
        ordered_qty: 3,
        adjustment_qty: 0,
        final_qty: 3,
        purchased_qty: 0,
        pack_size: 0,
        pack_count: 0,
        unit_price: 0,
        line_total: 0,
        variance_qty: -3,
        vendor_name: null,
        purchase_status: "draft",
        finalized_at: null,
        finalized_by: null,
        notes: null,
        source_orders: null,
      }],
      purchaseEdits: {},
      catalogMetaMap: new Map(),
    });
    expect(merged.rows[0].purchased_qty).toBe(3);
  });

  it("uses pack override only when both pack fields are positive", () => {
    const baseRow = {
      item_code: "VEG_TOMATO",
      item_en: "Tomato",
      item_hi: "टमाटर",
      category: "vegetables",
      ordered_qty: 2,
      adjustment_qty: 0,
      final_qty: 2,
      purchased_qty: 4,
      pack_size: 0,
      pack_count: 0,
      unit_price: 10,
      line_total: 40,
      variance_qty: 2,
      vendor_name: null,
      purchase_status: "draft" as const,
      finalized_at: null,
      finalized_by: null,
      notes: null,
      source_orders: null,
    };
    const notApplied = mergePurchaseRows({
      aggregatedRows: [baseRow],
      persistedRows: [baseRow as PurchasePlanDbRow],
      purchaseEdits: { VEG_TOMATO: { pack_size: 10, pack_count: 0, purchased_qty: 7 } },
      catalogMetaMap: new Map(),
    });
    expect(notApplied.rows[0].purchased_qty).toBe(7);

    const applied = mergePurchaseRows({
      aggregatedRows: [baseRow],
      persistedRows: [baseRow as PurchasePlanDbRow],
      purchaseEdits: { VEG_TOMATO: { pack_size: 10, pack_count: 2, purchased_qty: 7 } },
      catalogMetaMap: new Map(),
    });
    expect(applied.rows[0].purchased_qty).toBe(20);
  });

  it("documents duplicate split when same item comes with conflicting keys", () => {
    const rows = aggregateOrdersForPurchase(
      [{
        id: "1",
        order_ref: "ORD-DUP",
        restaurant_name: "R1",
        contact_name: "",
        contact_phone: "",
        order_date: "2026-01-01",
        delivery_date: "2026-01-02",
        status: "confirmed",
        notes: null,
        created_at: "",
        items: [
          { code: "VEG_TOMATO", en: "Tomato", hi: "टमाटर", qty: 1, category: "vegetables" },
          { code: "VEG_TOMATO_ALT", en: "Tomato", hi: "टमाटर", qty: 2, category: "vegetables" },
        ],
      }] as Order[],
      new Map([["Tomato", "VEG_TOMATO"]]),
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.ordered_qty).sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it("computes totals and stock delta", () => {
    const rows = [
      {
        item_code: "A",
        item_en: "A",
        item_hi: null,
        category: null,
        ordered_qty: 2,
        adjustment_qty: 0,
        final_qty: 2,
        purchased_qty: 3,
        pack_size: 0,
        pack_count: 0,
        unit_price: 10,
        line_total: 30,
        variance_qty: 1,
        vendor_name: null,
        purchase_status: "draft",
        finalized_at: null,
        finalized_by: null,
        notes: null,
        source_orders: null,
      },
    ];
    const totals = computePurchaseTotals(rows);
    expect(totals.requiredQty).toBe(2);
    expect(totals.purchasedQty).toBe(3);
    expect(totals.spend).toBe(30);

    const persistedByKey = new Map<string, PurchasePlanDbRow>([
      ["A", { ...rows[0], item_code: "A", item_en: "A", purchase_status: "draft", variance_qty: 0 }],
    ]);
    const delta = computeStockDeltaFromVariance(rows, persistedByKey);
    expect(delta.get("A")?.delta).toBe(1);
  });
});
