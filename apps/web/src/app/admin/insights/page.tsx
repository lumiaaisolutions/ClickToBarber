import { api } from "@/lib/api";
import { InsightsClient } from "@/components/admin/InsightsClient";

export const dynamic = "force-dynamic";

interface SmartSlots {
  period_weeks: number;
  suggestions: Array<{ barber_id: number; weekday: number; hour: number; visits_8w: number }>;
}

interface StockForecast {
  forecast: Array<{
    id: number; name: string; sku: string;
    stock: number; stock_min: number;
    sold_last_30d: number; per_day_avg: number;
    days_until_stockout: number | null; reorder_now: boolean;
  }>;
}

export default async function InsightsPage() {
  const [smart, stock] = await Promise.all([
    api<SmartSlots>("/admin/insights/smart-slots", { authed: true }).catch(() => null),
    api<StockForecast>("/admin/insights/stock-forecast", { authed: true }).catch(() => null),
  ]);
  return <InsightsClient smart={smart} stock={stock} />;
}
