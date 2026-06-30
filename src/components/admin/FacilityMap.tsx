"use client";

import type { Asset } from "@/lib/data/resources";

type Lane = {
  key: string;
  x: number;
  y: number;
  num: string;
  small?: boolean;
  outdoor?: boolean;
  gym?: boolean;
  splittable?: boolean;
  candidates: string[];
  equip?: { text: string; w: number }[];
};

// Fixed facility layout (approved v6 map). Each lane maps to a real space by name.
// Cages 1-7 are splittable (top/bottom). Bullpen 8-9 and gym are not.
const LANES: Lane[] = [
  { key: "gym", x: 22, y: 40, num: "Gym", small: true, gym: true, candidates: ["gym", "gym floor", "open gym"] },
  {
    key: "1",
    x: 136,
    y: 40,
    num: "1",
    splittable: true,
    candidates: ["cage 1"],
    equip: [
      { text: "ProBatter", w: 72 },
      { text: "HitTrax", w: 56 },
    ],
  },
  { key: "2", x: 250, y: 40, num: "2", splittable: true, candidates: ["cage 2"], equip: [{ text: "TrackMan", w: 64 }] },
  { key: "3", x: 364, y: 40, num: "3", splittable: true, candidates: ["cage 3"], equip: [{ text: "HitTrax", w: 56 }] },
  { key: "8", x: 478, y: 40, num: "8", outdoor: true, candidates: ["cage 8", "lane 8", "bullpen 8", "outdoor 8", "outside cage", "outdoor cage"] },
  { key: "4", x: 22, y: 232, num: "4", splittable: true, candidates: ["cage 4"] },
  { key: "5", x: 136, y: 232, num: "5", splittable: true, candidates: ["cage 5"] },
  { key: "6", x: 250, y: 232, num: "6", splittable: true, candidates: ["cage 6"] },
  { key: "7", x: 364, y: 232, num: "7", splittable: true, candidates: ["cage 7"] },
  { key: "9", x: 478, y: 232, num: "9", outdoor: true, candidates: ["cage 9", "lane 9", "bullpen 9", "outdoor 9"] },
];

const EMPTY_SET = new Set<string>();
const EMPTY_SPLIT = new Set<string>();
const EMPTY_HALF = new Map<string, Set<number>>();

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function matchId(candidates: string[], assets: Asset[]): string | null {
  for (const c of candidates) {
    const want = norm(c);
    const a = assets.find((x) => norm(x.name) === want);
    if (a) return a.id;
  }
  return null;
}

// Selection is communicated to the parent through these callbacks.
//  - onToggleWhole(id): select/deselect the whole cage
//  - onToggleSplit(id): flip a splittable cage between whole and split mode
//  - onToggleHalf(id, slot): select/deselect a half (slot 1 = top, 2 = bottom)
export default function FacilityMap({
  assets,
  selectedIds,
  splitIds = EMPTY_SPLIT,
  selectedHalves = EMPTY_HALF,
  bookedHalves = EMPTY_HALF,
  unavailable = EMPTY_SET,
  onToggleWhole,
  onToggleSplit,
  onToggleHalf,
}: {
  assets: Asset[];
  selectedIds: Set<string>;
  splitIds?: Set<string>;
  selectedHalves?: Map<string, Set<number>>;
  bookedHalves?: Map<string, Set<number>>;
  unavailable?: Set<string>;
  onToggleWhole: (assetId: string) => void;
  onToggleSplit: (assetId: string) => void;
  onToggleHalf: (assetId: string, slot:
