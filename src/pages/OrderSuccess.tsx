import { APP_CONFIG } from "@/config/app";

interface OrderSuccessProps {
  orderRef: string;
  restaurantName: string;
  deliveryDate: string;
  itemCount: number;
  phone: string;
  onPlaceAnother: () => void;
}

const OrderSuccess = ({
  orderRef,
  restaurantName,
  deliveryDate,
  itemCount,
  phone,
  onPlaceAnother,
}: OrderSuccessProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{APP_CONFIG.order.successTitle}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {APP_CONFIG.order.successDescription}
          <br />
          Watch for our call on <strong>{phone}</strong>.
        </p>

        <div className="bg-accent rounded-md p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Ref</span>
            <span className="font-semibold text-foreground">{orderRef}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Restaurant</span>
            <span className="font-medium text-foreground">{restaurantName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery Date</span>
            <span className="font-medium text-accent-foreground">{deliveryDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Items</span>
            <span className="font-medium text-foreground">{itemCount}</span>
          </div>
        </div>

        <div className="bg-warning rounded-md p-3 mb-6">
          <p className="text-xs text-warning-foreground">
            {APP_CONFIG.order.successWarningText}
          </p>
        </div>

        <button
          onClick={onPlaceAnother}
          className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Place Another Order
        </button>
      </div>
    </div>
  );
};

export default OrderSuccess;
