import { getAssets, getAssetTypes, getServices } from "@/lib/data/resources";
import SettingsManager from "@/components/admin/SettingsManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [assets, assetTypes, services] = await Promise.all([
    getAssets(),
    getAssetTypes(),
    getServices(),
  ]);
  return (
    <SettingsManager
      assets={assets}
      assetTypes={assetTypes}
      services={services}
    />
  );
}
