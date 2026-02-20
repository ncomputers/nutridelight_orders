import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG, CATEGORY_LABELS, type ItemCategory } from "@/data/items";
import ItemIcon from "@/components/ItemIcon";
import { hydrateCustomItemIcons } from "@/data/itemIcons";
import OrderSuccess from "./OrderSuccess";
import { APP_CONFIG } from "@/config/app";
import { formatIsoDateDdMmYyyy, getIndiaDateIso, shiftIsoDate } from "@/lib/datetime";
import { orderRepository } from "@/features/order/repositories/orderRepository";
import {
  buildSelectedOrderItems,
  makeOrderRef,
  nextQuantity,
  parseQuantityInput,
  selectedCountFromQuantities,
} from "@/features/order/domain/orderDomain";
import { orderQueryKeys } from "@/features/order/queryKeys";
import type { SelectedItems } from "@/features/order/types";

type CategoryFilter = ItemCategory | "all";
type OrderView = "form" | "summary" | "success";

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("r");

  const [activeTab, setActiveTab] = useState<CategoryFilter>("all");
  const [quantities, setQuantities] = useState<SelectedItems>({});
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [orderView, setOrderView] = useState<OrderView>("form");
  const [orderRef, setOrderRef] = useState("");
  const [submittedDeliveryDate, setSubmittedDeliveryDate] = useState("");
  const queryClient = useQueryClient();

  const todayIso = getIndiaDateIso();
  const tomorrowIso = shiftIsoDate(todayIso, 1);

  const OrderSummary = () => {
    const selectedItems = CATALOG.filter((item) => (quantities[item.code] || 0) > 0);

    return (
      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 bg-primary border-b border-border">
          <div className="container max-w-[560px] mx-auto px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{APP_CONFIG.brand.icon}</span>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground">{APP_CONFIG.brand.name}</h1>
                <p className="text-sm text-primary-foreground/80">Order Review</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container max-w-[560px] mx-auto px-4 py-4 pb-32">
          {/* Order Details */}
          <section className="bg-card rounded-lg border border-border p-4 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Order Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Order Date</p>
                <p className="text-sm font-medium">{formatIsoDateDdMmYyyy(todayIso)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivery Date</p>
                <p className="text-sm font-semibold text-accent-foreground bg-accent rounded-md px-2 py-1 inline-block">
                  {formatIsoDateDdMmYyyy(tomorrowIso)}
                </p>
              </div>
            </div>
          </section>

          {/* Restaurant Info */}
          <section className="bg-card rounded-lg border border-border p-4 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Restaurant</h2>
            <p className="text-sm font-medium">{restaurant?.name}</p>
          </section>

          {/* Order Items */}
          <section className="bg-card rounded-lg border border-border p-4 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Order Items ({selectedItems.length})</h2>
            <div className="space-y-2">
              {selectedItems.map((item) => {
                const qty = quantities[item.code] || 0;
                return (
                  <div key={item.code} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <ItemIcon itemEn={item.en} category={item.category} />
                        <span>{item.en}</span>
                      </p>
                      <p className="text-xs text-muted-foreground font-hindi">{item.hi}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">{qty} kg</span>
                      <button
                        onClick={() => updateQty(item.code, -qty)}
                        className="w-6 h-6 rounded-md border border-border bg-card text-foreground flex items-center justify-center text-xs hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                        aria-label={`Remove ${item.en}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contact Details */}
          <section className="bg-card rounded-lg border border-border p-4 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Contact Details</h2>
            <div className="space-y-2">
              {contactName && (
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{contactName}</p>
                </div>
              )}
              {contactPhone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{contactPhone}</p>
                </div>
              )}
              {!contactName && !contactPhone && (
                <p className="text-sm text-muted-foreground italic">No contact information provided</p>
              )}
            </div>
          </section>

          {/* Special Instructions */}
          {notes && (
            <section className="bg-card rounded-lg border border-border p-4 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Special Instructions</h2>
              <p className="text-sm text-foreground">{notes}</p>
            </section>
          )}

          {/* Disclaimer */}
          <div className="bg-warning rounded-lg border border-warning-foreground/20 p-4 mb-6">
            <p className="text-sm text-warning-foreground leading-relaxed">
              {APP_CONFIG.order.disclaimerText}
            </p>
          </div>
        </main>

        {/* Fixed Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
          <div className="container max-w-[560px] mx-auto space-y-2">
            <button
              onClick={handleSubmitOrder}
              disabled={submitMutation.isPending || !canSubmit}
              className="w-full h-12 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Order Request"}
            </button>
            <button
              onClick={handleBackToOrder}
              className="w-full h-10 rounded-md border border-border bg-card text-foreground font-medium text-sm hover:bg-accent transition-colors"
            >
              Back to Edit Order
            </button>
            {submitMutation.isError && (
              <p className="text-xs text-destructive text-center mt-2">
                Failed to submit. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: orderQueryKeys.restaurant(slug),
    queryFn: async () => {
      if (!slug) return null;
      return orderRepository.getActiveRestaurantBySlug(slug);
    },
    enabled: !!slug,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: availabilityRows = [] } = useQuery({
    queryKey: orderQueryKeys.itemAvailability(),
    queryFn: () => orderRepository.listItemAvailability(),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    availabilityRows.forEach((row) => {
      if (row.item_code) map.set(row.item_code, row.is_in_stock);
      map.set(row.item_en, row.is_in_stock);
    });
    return map;
  }, [availabilityRows]);

  useEffect(() => {
    hydrateCustomItemIcons(availabilityRows);
  }, [availabilityRows]);

  useEffect(() => {
    const channel = supabase
      .channel("item-availability-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "item_availability" },
        () => {
          queryClient.invalidateQueries({ queryKey: orderQueryKeys.itemAvailability() });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const selectedCount = useMemo(() => selectedCountFromQuantities(quantities), [quantities]);

  useEffect(() => {
    setQuantities((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((itemEn) => {
        const inStock = availabilityMap.get(itemEn);
        if (inStock === false && next[itemEn] > 0) {
          next[itemEn] = 0;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [availabilityMap]);

  const canSubmit = selectedCount > 0;

  const updateQty = (itemEn: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemEn] || 0;
      const next = nextQuantity(current, delta);
      return { ...prev, [itemEn]: next };
    });
  };

  const setQty = (itemEn: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [itemEn]: parseQuantityInput(value) }));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const submitTodayIso = getIndiaDateIso();
      const submitTomorrowIso = shiftIsoDate(submitTodayIso, 1);
      const items = buildSelectedOrderItems(quantities);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const ref = makeOrderRef(submitTodayIso);
        try {
          await orderRepository.insertOrder({
            orderRef: ref,
            restaurant: restaurant!,
            orderDateIso: submitTodayIso,
            deliveryDateIso: submitTomorrowIso,
            contactName,
            contactPhone,
            notes,
            status: APP_CONFIG.order.defaultStatus,
            items,
          });
          return { ref, deliveryDate: submitTomorrowIso };
        } catch (error: unknown) {
          const pgError = error as { code?: string };
          if (pgError.code !== "23505") throw error;
        }
      }

      throw new Error("Could not generate a unique order reference. Please retry.");
    },
    onSuccess: ({ ref, deliveryDate }) => {
      setOrderRef(ref);
      setSubmittedDeliveryDate(formatIsoDateDdMmYyyy(deliveryDate));
      setOrderView("success");
    },
  });

  const handleSubmitOrder = () => {
    if (!canSubmit || submitMutation.isPending) return;
    submitMutation.mutate();
  };

  const handleProceedToSummary = () => {
    setOrderView("summary");
  };

  const handleBackToOrder = () => {
    setOrderView("form");
  };

  const handlePlaceAnother = () => {
    setQuantities({});
    setContactName("");
    setContactPhone("");
    setNotes("");
    setOrderRef("");
    setSubmittedDeliveryDate("");
    setOrderView("form");
  };

  // Invalid or missing slug
  if (!slug) {
    return <InvalidSlugScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  if (!restaurant || error) {
    return <InvalidSlugScreen />;
  }

  if (orderView === "summary") {
    return <OrderSummary />;
  }

  if (orderView === "success") {
    return (
      <OrderSuccess
        orderRef={orderRef}
        restaurantName={restaurant.name}
        deliveryDate={submittedDeliveryDate || formatIsoDateDdMmYyyy(tomorrowIso)}
        itemCount={selectedCount}
        phone={contactPhone}
        onPlaceAnother={handlePlaceAnother}
      />
    );
  }

  const visibleCatalog = CATALOG.filter((item) => {
    const isInStock = availabilityMap.get(item.code) ?? availabilityMap.get(item.en) ?? true;
    if (APP_CONFIG.order.outOfStockDisplay === "hide") {
      return isInStock;
    }
    return true;
  });

  const categoryItems =
    activeTab === "all"
      ? visibleCatalog
      : visibleCatalog.filter((item) => item.category === activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-border">
        <div className="container max-w-[560px] mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{APP_CONFIG.brand.icon}</span>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">{APP_CONFIG.brand.name}</h1>
              <p className="text-sm text-primary-foreground/80">{restaurant.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-[560px] mx-auto px-4 py-4 pb-32">
        {/* Order Details */}
        <section className="bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Order Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Order Date</p>
              <p className="text-sm font-medium">{formatIsoDateDdMmYyyy(todayIso)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delivery Date</p>
              <p className="text-sm font-semibold text-accent-foreground bg-accent rounded-md px-2 py-1 inline-block">
                {formatIsoDateDdMmYyyy(tomorrowIso)}
              </p>
            </div>
          </div>
        </section>

        {/* Item Selection Badge */}
              {selectedCount > 0 && (
          <div className="mb-3 text-sm font-medium text-accent-foreground">
            🛒 {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap border transition-colors ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            }`}
          >
            🧺 All
            {selectedCount > 0 && (
              <span className="ml-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {selectedCount}
              </span>
            )}
          </button>
          {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((cat) => {
            const info = CATEGORY_LABELS[cat];
            const count = CATALOG.filter(
              (i) => i.category === cat && (quantities[i.code] || 0) > 0
            ).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap border transition-colors ${
                  activeTab === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                {info.icon} {info.label}
                {count > 0 && (
                  <span className="ml-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Item List */}
        <div className="space-y-1.5 mb-6">
          {categoryItems.map((item) => {
            const qty = quantities[item.code] || 0;
            const isSelected = qty > 0;
            const isInStock = availabilityMap.get(item.code) ?? availabilityMap.get(item.en) ?? true;
            return (
              <div
                key={item.code}
                className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                  isSelected
                    ? "bg-accent border-secondary/40"
                    : "bg-card border-border"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <ItemIcon itemEn={item.en} category={item.category} />
                    <span>{item.en}</span>
                  </p>
                  <p className="text-xs text-muted-foreground font-hindi">{item.hi}</p>
                  {!isInStock && APP_CONFIG.order.outOfStockDisplay === "disable" && (
                    <p className="text-[11px] text-destructive mt-0.5">Out of stock</p>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 shrink-0 ${!isInStock ? "opacity-50" : ""}`}>
                  <button
                    onClick={() => updateQty(item.code, -APP_CONFIG.order.quantityDecreaseStepKg)}
                    disabled={!isInStock}
                    className="w-8 h-8 rounded-md border border-border bg-card text-foreground flex items-center justify-center text-lg font-medium hover:bg-accent transition-colors"
                    aria-label={`Decrease ${item.en}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={qty || ""}
                    onChange={(e) => setQty(item.code, e.target.value)}
                    placeholder="0"
                    disabled={!isInStock}
                    className="w-14 h-8 text-center text-sm font-medium rounded-md border border-border bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                    min="0"
                    step={APP_CONFIG.order.quantityInputStepKg}
                  />
                  <button
                    onClick={() => updateQty(item.code, APP_CONFIG.order.quantityIncreaseStepKg)}
                    disabled={!isInStock}
                    className="w-8 h-8 rounded-md border border-border bg-card text-foreground flex items-center justify-center text-lg font-medium hover:bg-accent transition-colors"
                    aria-label={`Increase ${item.en}`}
                  >
                    +
                  </button>
                  <span className="text-xs text-muted-foreground w-5">kg</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Details */}
        <section className="bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Contact Details</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Your Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Chef / Manager name"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Phone Number</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </section>

        {/* Special Instructions */}
        <section className="bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Special Instructions</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, APP_CONFIG.order.maxNotesLength))}
            placeholder="Cut preference, quality notes, anything specific…"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {notes.length}/{APP_CONFIG.order.maxNotesLength}
          </p>
        </section>

        {/* Disclaimer */}
        <div className="bg-warning rounded-lg border border-warning-foreground/20 p-4 mb-6">
          <p className="text-sm text-warning-foreground leading-relaxed">
            {APP_CONFIG.order.disclaimerText}
          </p>
        </div>
      </main>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="container max-w-[560px] mx-auto">
          <button
            onClick={handleProceedToSummary}
            disabled={!canSubmit}
            className="w-full h-12 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Review Order ({selectedCount} item{selectedCount !== 1 ? "s" : ""})
          </button>
        </div>
      </div>
    </div>
  );
};

const InvalidSlugScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="bg-card rounded-lg border border-border p-8 text-center max-w-sm">
      <div className="text-4xl mb-4">🚫</div>
      <h1 className="text-xl font-bold text-foreground mb-2">Invalid Link</h1>
      <p className="text-sm text-muted-foreground">
        Please contact your supplier for a valid order link.
      </p>
    </div>
  </div>
);

export default OrderPage;
