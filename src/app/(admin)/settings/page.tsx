import { getAssets, getAssetTypes, getServices } from "@/lib/data/resources";
import { getBookingTypes } from "@/lib/data/booking-type-actions";
import SettingsManager from "@/components/admin/SettingsManager";
import BookingTypesManager from "@/components/admin/BookingTypesManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [assets, assetTypes, services, bookingTypes] = await Promise.all([
    getAssets(),
    getAssetTypes(),
    getServices(),
    getBookingTypes(),
  ]);
  return (
    <>
      <SettingsManager
        assets={assets}
        assetTypes={assetTypes}
        services={services}
      />
      <BookingTypesManager types={bookingTypes} />
    </>
  );
}

