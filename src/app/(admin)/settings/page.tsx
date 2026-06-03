import { getAssets, getServices } from "@/lib/data/resources";
import SettingsManager from "@/components/admin/SettingsManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [assets, services] = await Promise.all([getAssets(), getServices()]);
  return <SettingsManager assets={assets} services={services} />;
}
