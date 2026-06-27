import { getAssets, getAssetTypes, getServices } from "@/lib/data/resources";
import { getBookingTypes } from "@/lib/data/booking-type-actions";
import { getServiceCategories } from "@/lib/data/category-actions";
import SettingsManager from "@/components/admin/SettingsManager";
import BookingTypesManager from "@/components/admin/BookingTypesManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [assets, assetTypes, services, bookingTypes, categories] =
    await Promise.all([
      getAssets(),
      getAssetTypes(),
      getServices(),
      getBookingTypes(),
      getServiceCategories(),
    ]);
  return (
    <>
      <SettingsManager
        assets={assets}
        assetTypes={assetTypes}
        services={services}
        categories={categories}
      />
      <BookingTypesManager types={bookingTypes} />
    </>
  );
}
