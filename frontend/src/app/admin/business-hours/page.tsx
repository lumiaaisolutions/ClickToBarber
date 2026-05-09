import { api } from "@/lib/api";
import { getMe } from "@/lib/admin-api";
import { BusinessHoursClient } from "@/components/admin/BusinessHoursClient";

export const dynamic = "force-dynamic";

interface Hour {
  weekday: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export default async function BusinessHoursPage() {
  const [hours, me] = await Promise.all([
    api<Hour[]>("/admin/business-hours", { authed: true }).catch(
      () => [] as Hour[],
    ),
    getMe().catch(() => null),
  ]);

  // Si el endpoint devuelve vacío (no debería: el controller siempre rellena
  // los 7 días), generamos un fallback "todo cerrado" para que la UI tenga algo.
  const safeHours: Hour[] =
    hours.length === 7
      ? hours
      : Array.from({ length: 7 }, (_, weekday) => ({
          weekday,
          open_time: "10:00",
          close_time: "19:00",
          is_closed: true,
        }));

  return <BusinessHoursClient initial={safeHours} canWrite={me?.user.can_write ?? false} />;
}
