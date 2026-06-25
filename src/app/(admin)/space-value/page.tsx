import { getSpaceValue } from "@/lib/data/space-value-actions";
import SpaceValueManager from "@/components/admin/SpaceValueManager";

export const dynamic = "force-dynamic";

export default async function SpaceValuePage() {
  const initial = await getSpaceValue("week");
  return <SpaceValueManager initial={initial} initialPeriod="week" />;
}
