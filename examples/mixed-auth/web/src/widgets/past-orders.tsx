import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";
import "@/index.css";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    return "Just now";
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function PastOrders() {
  const { output, isPending } = useToolInfo<"see-past-orders">();

  if (isPending) {
    return (
      <div className="container centered">
        <span className="icon-large animate-spin">&#9749;</span>
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (!output) {
    return null;
  }

  if ("requiresAuth" in output) {
    return (
      <div className="container centered">
        <div className="lock-icon">&#128274;</div>
        <div>
          <h3 className="auth-title">Sign In Required</h3>
          <p className="auth-text">
            Please authenticate to view your past orders
          </p>
        </div>
      </div>
    );
  }

  const { orders } = output;

  if (orders.length === 0) {
    return (
      <div className="container centered">
        <span className="icon-large">&#128230;</span>
        <p>No orders yet</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <span className="header-icon">&#9749;</span>
        <span className="header-title">Your Orders</span>
        <span className="header-badge">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card animate-fade-in">
            <div className="order-header">
              <img
                src={order.shop.imageUrl}
                alt={order.shop.name}
                className="order-shop-image"
              />
              <div className="order-shop-info">
                <div className="order-shop-name">{order.shop.name}</div>
                <div className="order-time">
                  <span>&#128337;</span>
                  <span>{formatDate(order.timestamp)}</span>
                </div>
              </div>
              <span className={`status-badge ${order.status}`}>
                {order.status}
              </span>
            </div>

            <div className="order-items">
              {order.items.map((item, itemIndex) => (
                <div key={`${order.id}-${itemIndex}`} className="order-item">
                  <div>
                    <span className="order-item-name">{item.name}</span>
                    <span className="order-item-size">{item.size}</span>
                  </div>
                  <span className="order-item-price">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="order-total">
                <span className="order-total-label">Total</span>
                <span className="order-total-value">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PastOrders;
mountWidget(<PastOrders />);
