/**
 * Maps the raw order status/payment_status values (returned by the API) to
 * localized Arabic labels and a tonal badge class. Mirrors App\Enums\OrderStatus
 * and App\Enums\OrderPaymentStatus on the server.
 */

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  refunded: "مسترد",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "بانتظار الدفع",
  partial: "مدفوع جزئياً",
  paid: "مدفوع",
  failed: "فشل الدفع",
  refunded: "مسترد",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_LABELS[status] ?? status;
}

/** Tonal badge classes per status (light, borderless). */
export function statusTone(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-success-soft text-success";
    case "shipped":
    case "processing":
      return "bg-accent-soft text-accent";
    case "cancelled":
    case "refunded":
      return "bg-danger-soft text-danger";
    default:
      return "bg-surface-2 text-foreground-2";
  }
}
