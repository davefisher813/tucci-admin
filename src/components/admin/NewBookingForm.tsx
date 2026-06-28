"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { moneyExact, ymd } from "@/lib/format";
import {
  createBulkBookings,
  type Occurrence,
  type BulkResult,
} from "@/lib/data/bulk-booking-actions";
import type {
  Asset,
  AthleteLite,
  Coach,
  FamilyLite,
  Service,
} from "@/lib/data/resources";
import FacilityMap from "@/components/admin/FacilityMap";
import {
  getDayBookings,
  type DayBooking,
} from "@/lib/data/availability-actions";
import {
  createBookingType,
  type BookingType,
} from "@/lib/data/booking-type-actions";
import { createService } from "@/lib/data/settings-actions";
import { createFamily, createAthlete } from "@/lib/data/family-actions";
import { createCoachWithLogin } from "@/lib/data/coach-actions";

const WEEKDAYS = [
  ["Su", 0],
  ["Mo", 1],
  ["Tu", 2],
  ["We", 3],
  ["Th", 4],
  ["Fr", 5],
  ["Sa", 6],
] as const;

// "HH:MM" start-time options, 8:00 AM through 9:00 PM in half-hour steps.
const START_OPTIONS: { value: string; label: string }[] = [];
for (let h = 8; h <= 21; h++) {
  for (const m of [0, 30]) {
    if (h === 21 && m === 30) continue;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const disp = `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
    START_OPTIONS.push({ value: `${hh}:${mm}`, label: disp });
  }
}

// End-time options: 8:30 AM through 10:00 PM in half-hour steps.
const END_OPTIONS: { value: string; label: string }[] = [];
for (let h = 8; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 8 && m === 0) continue;
    if (h === 22 && m === 30) continue;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const disp = `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
    END_OPTIONS.push({ value: `${hh}:${mm}`, label: disp });
  }
}
function hmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}
function minToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ymdLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day
