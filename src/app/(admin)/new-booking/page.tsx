import { Suspense } from "react";
import {
  getAssets,
  getAthletes,
  getCoaches,
  getFamilies,
  getServices,
} from "@/lib/data/resources";
import { getBookingTypes } from "@/lib/data/booking-type-actions";
import NewBookingForm from "@/components/admin/NewBookingForm";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const [assets, services, coaches, families, athletes, bookingTypes] =
    await Promise.all([
      getAssets(),
      getServices(),
      getCoaches(),
      getFamilies(),
      getAthletes(),
      getBookingTypes(),
    ]);

  if (assets.length === 0 || services.length === 0) {
    return (
      <div className="mx-auto max-w-[640px]">
        <div className="rounded-[16px] border border-dashed border-line-2 bg-paper p-10 text-center text-muted">
          <b className="mb-[5px] block font-display text-[16px] text-text">
            Setup needed
          </b>
          Add spaces and services in Settings before creating bookings.
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="text-muted">Loading…</div>}>
      <NewBookingForm
        assets={assets}
        services={services}
        coaches={coaches}
        families={families}
        athletes={athletes}
        bookingTypes={bookingTypes}
      />
    </Suspense>
  );
}
