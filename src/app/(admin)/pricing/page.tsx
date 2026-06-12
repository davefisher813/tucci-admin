import { getServices } from "@/lib/data/resources";
import PricingManager from "@/components/admin/PricingManager";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const services = await getServices();
  return <PricingManager services={services} />;
}
