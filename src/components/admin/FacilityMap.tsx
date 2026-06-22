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
  candidates: string[];
  equip?: { text: string; w: number }[];
};

// Fixed facility layout (approved v6 map). Each lane maps to a real space by name.
const LANES: Lane[] = [
  { key: "gym", x: 22, y: 40, num: "Gym", small: true, gym: true, candidates: ["gym", "gym floor", "open gym"] },
  {
    key: "1",
    x: 136,
    y: 40,
    num: "1",
    candidates: ["cage 1"],
    equip: [
      { text: "ProBatter", w: 72 },
      { text: "HitTrax", w: 56 },
    ],
  },
  { key: "2", x: 250, y: 40, num: "2", candidates: ["cage 2"], equip: [{ text: "TrackMan", w: 64 }] },
  { key: "3", x: 364, y: 40, num: "3", candidates: ["cage 3"], equip: [{ text: "HitTrax", w: 56 }] },
  { key: "8", x: 478, y: 40, num: "8", outdoor: true, candidates: ["lane 8", "bullpen 8", "outdoor 8", "outside cage", "outdoor cage"] },
  { key: "4", x: 22, y: 232, num: "4", candidates: ["cage 4"] },
  { key: "5", x: 136, y: 232, num: "5", candidates: ["cage 5"] },
  { key: "6", x: 250, y: 232, num: "6", candidates: ["cage 6"] },
  { key: "7", x: 364, y: 232, num: "7",
