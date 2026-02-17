import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type OrderStatus = "pending" | "confirmed" | "rejected";

interface OrderItem {
  en: string;
  hi: string;
  qty: number;
  category: string;
}

interface Order {
  id: string;
  order_ref: string;
  restaurant_name: string;
  contact_name: string;
  contact_phone: string;
  order_date: string;
  delivery_date: string;
  items: OrderItem[];
  notes: string | null;
  status: string;
  created_at: string;
}

const CATEGORY_BADGES: Record<string, string> = {
  vegetables: "🥦",
  herbs: "🌿",
  fruits: "🥝",
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrderStatus>("pending");

  useEffect(() => {
    if (sessionStorage.getItem("fs_admin") !== "1") {
      navigate("/admin/login");
    }
  }, [navigate]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Order[];
    },
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const filteredOrders = orders.filter((o) => o.status === activeTab);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const logout = () => {
    sessionStorage.removeItem("fs_admin");
    navigate("/admin/login");
  };

  const tabs: { key: OrderStatus; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-foreground sticky top-0 z-50">
        <div className="container max-w-[700px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-background">Admin Panel</h1>
            <p className="text-xs text-background/60">{format(new Date(), "dd MMM yyyy")}</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-background/80 hover:text-background border border-background/30 rounded-md px-3 py-1.5 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card sticky top-[60px] z-40">
        <div className="container max-w-[700px] mx-auto px-4 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-warning text-warning-foreground text-xs font-bold rounded-full px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="container max-w-[700px] mx-auto px-4 py-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No orders here.</p>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onConfirm={() => updateStatus.mutate({ id: order.id, status: "confirmed" })}
                onReject={() => updateStatus.mutate({ id: order.id, status: "rejected" })}
                isPending={order.status === "pending"}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const OrderCard = ({
  order,
  onConfirm,
  onReject,
  isPending,
}: {
  order: Order;
  onConfirm: () => void;
  onReject: () => void;
  isPending: boolean;
}) => {
  const items = (order.items || []) as OrderItem[];

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">🏪 {order.restaurant_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ref: {order.order_ref} · Placed {format(new Date(order.created_at), "hh:mm a")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Dates */}
      <div className="flex gap-4 mb-3 text-xs">
        <div>
          <span className="text-muted-foreground">Order: </span>
          <span className="font-medium">{order.order_date}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Delivery: </span>
          <span className="font-semibold text-accent-foreground">{order.delivery_date}</span>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-accent rounded-md px-3 py-2 mb-3 flex items-center justify-between">
        <span className="text-sm text-foreground font-medium">{order.contact_name}</span>
        <a
          href={`tel:${order.contact_phone}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          📞 {order.contact_phone}
        </a>
      </div>

      {/* Items */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
          Items ({items.length})
        </p>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs">{CATEGORY_BADGES[item.category] || "📦"}</span>
                <span className="font-medium text-foreground">{item.en}</span>
                <span className="text-xs text-muted-foreground font-hindi">{item.hi}</span>
              </div>
              <span className="font-semibold text-foreground shrink-0">{item.qty} kg</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-warning/50 rounded-md px-3 py-2 mb-3">
          <p className="text-xs text-warning-foreground">📝 {order.notes}</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            ✅ Confirm Order
          </button>
          <button
            onClick={onReject}
            className="flex-1 h-10 rounded-md bg-card text-destructive font-semibold text-sm border border-destructive hover:bg-destructive/10 transition-colors"
          >
            ❌ Reject Order
          </button>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: "bg-warning text-warning-foreground",
    confirmed: "bg-accent text-accent-foreground",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${styles[status] || ""}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default AdminPanel;
