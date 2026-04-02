import type { OrderStatus, OrderDecision } from "../types/screening";
import { STATUS_CONFIG, DECISION_CONFIG } from "../types/screening";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  decision?: OrderDecision;
}

export function OrderStatusBadge({ status, decision }: OrderStatusBadgeProps) {
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const decisionConfig = decision ? DECISION_CONFIG[decision] : null;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.darkBgColor} ${statusConfig.darkColor}`}
      >
        {statusConfig.label}
      </span>
      {decisionConfig && (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${decisionConfig.bgColor} ${decisionConfig.color} ${decisionConfig.darkBgColor} ${decisionConfig.darkColor}`}
        >
          {decisionConfig.label}
        </span>
      )}
    </div>
  );
}
