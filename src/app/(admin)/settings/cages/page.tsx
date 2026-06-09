import {
  getAssets,
  getAssetTypes,
  getSpaceCoverage,
} from "@/lib/data/resources";
import SpaceSetupManager from "@/components/admin/SpaceSetupManager";

export const dynamic = "force-dynamic";

export default async function SpaceSetupPage() {
  const [assets, assetTypes, coverage] = await Promise.all([
    getAssets(),
    getAssetTypes(),
    getSpaceCoverage(),
  ]);
  return (
    <SpaceSetupManager
      assets={assets}
      assetTypes={assetTypes}
      coverage={coverage}
    />
  );
}
