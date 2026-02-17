import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG, CATEGORY_LABELS, type ItemCategory } from "@/data/items";
import { format, addDays } from "date-fns";
import OrderSuccess from "./OrderSuccess";

interface SelectedItems {
  [key: string]: number; // key = en name, value = qty
}

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("r");

  const [activeTab, setActiveTab] = useState<ItemCategory>("vegetables");
  const [quantities, setQuantities] = useState<SelectedItems>({});
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [orderRef, setOrderRef] = useState("");

  const today = new Date();
  const tomorrow = addDays(today, 1);

  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const selectedCount = useMemo(
    () => Object.values(quantities).filter((q) => q > 0).length,
    [quantities]
  );

  const phoneValid = /^\d{10}$/.test(contactPhone);
  const canSubmit = selectedCount > 0 && phoneValid && contactName.trim().length > 0;

  const updateQty = (itemEn: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemEn] || 0;
      const next = Math.max(0, Math.round((current + delta) * 10) / 10);
      return { ...prev, [itemEn]: next };
    });
  };

  const setQty = (itemEn: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      setQuantities((prev) => ({ ...prev, [itemEn]: 0 }));
    } else {
      setQuantities((prev) => ({ ...prev, [itemEn]: Math.round(num * 10) / 10 }));
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const ref = "ORD-" + Date.now().toString().slice(-6);
      const items = CATALOG.filter((item) => (quantities[item.en] || 0) > 0).map((item) => ({
        en: item.en,
        hi: item.hi,
        qty: quantities[item.en],
        category: item.category,
      }));

      const { error } = await supabase.from("orders").insert({
        order_ref: ref,
        restaurant_id: restaurant!.id,
        restaurant_name: restaurant!.name,
        restaurant_slug: restaurant!.slug,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        order_date: format(today, "yyyy-MM-dd"),
        delivery_date: format(tomorrow, "yyyy-MM-dd"),
        items,
        notes: notes.trim() || null,
        status: "pending",
      });

      if (error) throw error;
      return ref;
    },
    onSuccess: (ref) => {
      setOrderRef(ref);
      setSubmitted(true);
    },
  });

  const handlePlaceAnother = () => {
    setQuantities({});
    setContactName("");
    setContactPhone("");
    setNotes("");
    setSubmitted(false);
    setOrderRef("");
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

  if (submitted) {
    return (
      <OrderSuccess
        orderRef={orderRef}
        restaurantName={restaurant.name}
        deliveryDate={format(tomorrow, "dd/MM/yyyy")}
        itemCount={selectedCount}
        phone={contactPhone}
        onPlaceAnother={handlePlaceAnother}
      />
    );
  }

  const categoryItems = CATALOG.filter((item) => item.category === activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-border">
        <div className="container max-w-[560px] mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥬</span>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">FreshSupply</h1>
              <p className="text-sm text-primary-foreground/80">{restaurant.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      <div className="bg-warning border-b border-warning-foreground/20">
        <div className="container max-w-[560px] mx-auto px-4 py-2.5 text-center">
          <p className="text-sm font-medium text-warning-foreground">
            ⏰ Orders close at 11:00 PM · Next-day delivery only
          </p>
        </div>
      </div>

      <main className="container max-w-[560px] mx-auto px-4 py-4 pb-32">
        {/* Order Details */}
        <section className="bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Order Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Order Date</p>
              <p className="text-sm font-medium">{format(today, "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delivery Date</p>
              <p className="text-sm font-semibold text-accent-foreground bg-accent rounded-md px-2 py-1 inline-block">
                {format(tomorrow, "dd/MM/yyyy")}
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
          {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((cat) => {
            const info = CATEGORY_LABELS[cat];
            const count = CATALOG.filter(
              (i) => i.category === cat && (quantities[i.en] || 0) > 0
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
            const qty = quantities[item.en] || 0;
            const isSelected = qty > 0;
            return (
              <div
                key={item.en}
                className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                  isSelected
                    ? "bg-accent border-secondary/40"
                    : "bg-card border-border"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.en}</p>
                  <p className="text-xs text-muted-foreground font-hindi">{item.hi}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQty(item.en, -0.5)}
                    className="w-8 h-8 rounded-md border border-border bg-card text-foreground flex items-center justify-center text-lg font-medium hover:bg-accent transition-colors"
                    aria-label={`Decrease ${item.en}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={qty || ""}
                    onChange={(e) => setQty(item.en, e.target.value)}
                    placeholder="0"
                    className="w-14 h-8 text-center text-sm font-medium rounded-md border border-border bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                    min="0"
                    step="0.5"
                  />
                  <button
                    onClick={() => updateQty(item.en, 0.5)}
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
              <label className="text-xs text-muted-foreground block mb-1">Your Name *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Chef / Manager name"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Phone Number *</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {contactPhone.length > 0 && !phoneValid && (
                <p className="text-xs text-destructive mt-1">Enter a valid 10-digit number</p>
              )}
            </div>
          </div>
        </section>

        {/* Special Instructions */}
        <section className="bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Special Instructions</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 300))}
            placeholder="Cut preference, quality notes, anything specific…"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{notes.length}/300</p>
        </section>

        {/* Disclaimer */}
        <div className="bg-warning rounded-lg border border-warning-foreground/20 p-4 mb-6">
          <p className="text-sm text-warning-foreground leading-relaxed">
            ⚠️ This is an order request, not a confirmed order. Final supply is subject to availability and same-day mandi rates. No payment is collected here. Our team will confirm by 7:00 AM.
          </p>
        </div>
      </main>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="container max-w-[560px] mx-auto">
          <button
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
            className="w-full h-12 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {submitMutation.isPending
              ? "Submitting..."
              : `Submit Order Request (${selectedCount} item${selectedCount !== 1 ? "s" : ""})`}
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
