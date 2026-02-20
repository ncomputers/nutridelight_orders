import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { formatIsoDateDdMmYyyy } from "@/lib/datetime";
import type { DeliveredOrder } from "@/features/sales/types";

interface OrderSelectorProps {
  orders: DeliveredOrder[];
  isLoading: boolean;
  selectedOrderIds: string[];
  selectedRestaurantId: string | null;
  invoicedOrderIdSet: Set<string>;
  isCreatePending: boolean;
  onToggleOrder: (order: DeliveredOrder) => void;
  onClearSelection: () => void;
  onCreateInvoice: () => void;
}

const OrderSelector = ({
  orders,
  isLoading,
  selectedOrderIds,
  selectedRestaurantId,
  invoicedOrderIdSet,
  isCreatePending,
  onToggleOrder,
  onClearSelection,
  onCreateInvoice,
}: OrderSelectorProps) => {
  const groupedOrders = useMemo(() => {
    const map = new Map<string, { restaurantName: string; rows: DeliveredOrder[] }>();
    for (const order of orders) {
      const key = order.restaurant_id || "__unknown__";
      if (!map.has(key)) {
        map.set(key, { restaurantName: order.restaurant_name || "Unknown Restaurant", rows: [] });
      }
      map.get(key)?.rows.push(order);
    }
    return Array.from(map.entries())
      .map(([restaurantId, value]) => ({
        restaurantId,
        restaurantName: value.restaurantName,
        rows: value.rows.sort((a, b) => (b.delivery_date || "").localeCompare(a.delivery_date || "")),
      }))
      .sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));
  }, [orders]);

  return (
    <div className="border border-border rounded-md p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold">1. Order Selection</h3>
        <p className="text-xs text-muted-foreground">Selected: {selectedOrderIds.length}</p>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading delivered orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-xs text-muted-foreground">No delivered orders in selected range.</p>
      ) : (
        <>
          <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
            {groupedOrders.map((group) => (
              <div key={group.restaurantId}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{group.restaurantName}</p>
                <div className="space-y-2">
                  {group.rows.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    const isInvoiced = invoicedOrderIdSet.has(order.id);
                    const isRestaurantMismatch =
                      selectedRestaurantId !== null && selectedRestaurantId !== order.restaurant_id && !isSelected;
                    const isDisabled = isInvoiced || isRestaurantMismatch;
                    return (
                      <label
                        key={order.id}
                        className={`flex items-start gap-2 border rounded-md p-2 ${isSelected ? "border-primary bg-accent/30" : "border-border"} ${isDisabled ? "opacity-60" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => onToggleOrder(order)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{order.order_ref}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatIsoDateDdMmYyyy(order.delivery_date)} · Items: {(order.items || []).length}
                          </p>
                          {isInvoiced && <p className="text-xs text-muted-foreground">Already invoiced</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onCreateInvoice}
              disabled={selectedOrderIds.length === 0 || isCreatePending}
            >
              Create Invoice from Selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearSelection}
              disabled={selectedOrderIds.length === 0}
            >
              Clear
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderSelector;
