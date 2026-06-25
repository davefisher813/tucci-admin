import { getFacilityHours, getPeakWindow } from "@/lib/data/hours-actions";
import HoursManager from "@/components/admin/HoursManager";

export const dynamic = "force-dynamic";

export default async function HoursPage() {
  const [hours, peak] = await Promise.all([
    getFacilityHours(),
    getPeakWindow(),
  ]);
  return <HoursManager initialHours={hours} initialPeak={peak} />;
}
