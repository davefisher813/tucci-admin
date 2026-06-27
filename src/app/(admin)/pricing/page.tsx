import { getServices } from "@/lib/data/resources";
import { getServiceCategories } from "@/lib/data/category-actions";
import PricingManager from "@/components/admin/PricingManager";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [services, categories] = await Promise.all([
    getServices(),
    getServiceCategories(),
  ]);
  return <PricingManager services={services} categories={categories} />;
}
