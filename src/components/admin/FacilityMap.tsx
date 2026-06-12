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
  // Top row — Field 1 half
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
  // Bottom row — Field 2 half
  { key: "4", x: 22, y: 232, num: "4", candidates: ["cage 4"] },
  { key: "5", x: 136, y: 232, num: "5", candidates: ["cage 5"] },
  { key: "6", x: 250, y: 232, num: "6", candidates: ["cage 6"] },
  { key: "7", x: 364, y: 232, num: "7", candidates: ["cage 7"] },
  { key: "9", x: 478, y: 232, num: "9", outdoor: true, candidates: ["lane 9", "bullpen 9", "outdoor 9"] },
];

const EMPTY_SET = new Set<string>();

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function matchId(candidates: string[], assets: Asset[]): string | null {
  for (const c of candidates) {
    const want = norm(c);
    const a = assets.find((x) => norm(x.name) === want);
    if (a) return a.id;
  }
  return null;
}

export default function FacilityMap({
  assets,
  selectedAssetId,
  unavailable = EMPTY_SET,
  onSelect,
}: {
  assets: Asset[];
  selectedAssetId: string;
  unavailable?: Set<string>;
  onSelect: (assetId: string) => void;
}) {
  return (
    <div className="nbk-map-wrap">
      <div className="nbk-map-svg-wrap">
        <svg className="nbk-map-svg" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="nbkStripe"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <rect width="8" height="8" className="nbk-stripe-bg" />
              <line x1="0" y1="0" x2="0" y2="8" className="nbk-stripe-line" />
            </pattern>
          </defs>
          <text x={22} y={22} className="nbk-field-label">
            Field 1 · First Half
          </text>
          <text x={478} y={22} className="nbk-field-label">
            Outdoor
          </text>

          {LANES.filter((l) => l.y === 40).map((l) => (
            <LaneG key={l.key} lane={l} assets={assets} selectedAssetId={selectedAssetId} unavailable={unavailable} onSelect={onSelect} />
          ))}

          <line className="nbk-divider-line" x1={22} y1={206} x2={464} y2={206} strokeDasharray="4 4" />
          <text x={243} y={202} className="nbk-divider-text" textAnchor="middle">
            8 Retractable Nets
          </text>
          <text x={22} y={220} className="nbk-field-label">
            Field 2 · Second Half
          </text>

          {LANES.filter((l) => l.y === 232).map((l) => (
            <LaneG key={l.key} lane={l} assets={assets} selectedAssetId={selectedAssetId} unavailable={unavailable} onSelect={onSelect} />
          ))}
        </svg>
      </div>

      <div className="nbk-map-legend">
        <span className="nbk-lg nbk-lg-avail">
          <span className="nbk-lg-swatch" />
          Available
        </span>
        <span className="nbk-lg nbk-lg-selected">
          <span className="nbk-lg-swatch" />
          Selected
        </span>
        <span className="nbk-lg nbk-lg-outdoor">
          <span className="nbk-lg-swatch" />
          Outdoor
        </span>
        <span className="nbk-lg nbk-lg-booked">
          <span className="nbk-lg-swatch" />
          Booked
        </span>
        <span className="nbk-lg nbk-lg-disabled">
          <span className="nbk-lg-swatch" />
          Not set up
        </span>
      </div>

      <style>{`
        .nbk-map-wrap{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:12px;}
        .nbk-map-svg-wrap{background:var(--bg);border-radius:12px;padding:14px;}
        .nbk-map-svg{display:block;width:100%;height:auto;max-height:360px;}
        .nbk-map-legend{display:flex;gap:16px;flex-wrap:wrap;padding:12px 4px 2px;font-family:var(--fd);font-size:11px;font-weight:600;color:var(--muted);justify-content:center;}
        .nbk-lg{display:inline-flex;align-items:center;gap:7px;}
        .nbk-lg-swatch{width:14px;height:14px;border-radius:5px;flex-shrink:0;}
        .nbk-lg-avail .nbk-lg-swatch{background:var(--paper);border:1.5px solid var(--line-2);}
        .nbk-lg-selected .nbk-lg-swatch{background:var(--gold);border:1.5px solid #B07F00;}
        .nbk-lg-outdoor .nbk-lg-swatch{background:rgba(125,196,232,0.22);border:1.5px solid var(--accent);}
        .nbk-lg-disabled .nbk-lg-swatch{background:var(--bg);border:1.5px solid var(--line);opacity:.6;}

        .nbk-lane{cursor:pointer;}
        .nbk-lane-rect{fill:var(--paper);stroke:var(--line-2);stroke-width:1.5;transition:stroke .15s, fill .15s;}
        .nbk-lane:hover .nbk-lane-rect{fill:rgba(125,196,232,0.10);stroke:var(--sky);stroke-width:2.5;}
        .nbk-lane.nbk-selected .nbk-lane-rect{fill:var(--gold);stroke:#B07F00;stroke-width:3;}
        .nbk-lane-outdoor .nbk-lane-rect{fill:rgba(125,196,232,0.14);stroke:var(--accent);}
        .nbk-lane-outdoor:hover .nbk-lane-rect{fill:rgba(125,196,232,0.22);stroke:var(--sky);stroke-width:2.5;}
        .nbk-lane-num{font-family:var(--fd);font-weight:900;font-size:18px;fill:var(--text);pointer-events:none;}
        .nbk-lane-status{font-family:var(--fd);font-weight:600;font-size:8px;fill:var(--muted);pointer-events:none;}
        .nbk-lane.nbk-selected .nbk-lane-num,.nbk-lane.nbk-selected .nbk-lane-status{fill:#0A0A0A !important;opacity:1;}
        .nbk-lane-gym .nbk-lane-rect{fill:rgba(125,196,232,0.06);stroke:var(--sky);stroke-dasharray:4,3;}
        .nbk-lane-gym:hover .nbk-lane-rect{fill:rgba(125,196,232,0.14);stroke:var(--sky);stroke-width:2.5;stroke-dasharray:0;}
        .nbk-lane-gym.nbk-selected .nbk-lane-rect{stroke-dasharray:0;}
        .nbk-lane-num-sm{font-size:14px !important;}
        .nbk-equip-tag{fill:rgba(125,196,232,0.20);}
        .nbk-equip-tag-text{font-family:var(--fd);font-weight:700;font-size:8px;fill:var(--accent);letter-spacing:0.01em;}
        .nbk-lane.nbk-selected .nbk-equip-tag{fill:rgba(10,10,10,0.10);}
        .nbk-lane.nbk-selected .nbk-equip-tag-text{fill:#0A0A0A;}
        .nbk-field-label{font-family:var(--fd);font-weight:700;font-size:10px;fill:var(--accent);letter-spacing:0.03em;}
        .nbk-divider-text{font-family:var(--fd);font-weight:600;font-size:9px;fill:var(--muted);letter-spacing:0.03em;}
        .nbk-divider-line{stroke:var(--line-2);stroke-width:1;}

        .nbk-lane-disabled{cursor:not-allowed;}
        .nbk-lane-disabled .nbk-lane-rect{fill:var(--bg);stroke:var(--line);opacity:.55;}
        .nbk-lane.nbk-lane-disabled:hover .nbk-lane-rect{fill:var(--bg);stroke:var(--line);stroke-width:1.5;}
        .nbk-lane-disabled .nbk-lane-num,.nbk-lane-disabled .nbk-lane-status{fill:var(--muted);opacity:.6;}

        .nbk-stripe-bg{fill:var(--line);}
        .nbk-stripe-line{stroke:var(--line-2);stroke-width:2;}
        .nbk-lane-booked{cursor:not-allowed;}
        .nbk-lane.nbk-lane-booked .nbk-lane-rect{fill:url(#nbkStripe);stroke:var(--line-2);stroke-width:1.5;}
        .nbk-lane.nbk-lane-booked:hover .nbk-lane-rect{fill:url(#nbkStripe);stroke:var(--line-2);stroke-width:1.5;}
        .nbk-lane-booked .nbk-lane-num,.nbk-lane-booked .nbk-lane-status{fill:var(--muted);opacity:.7;}
        .nbk-lane-booked .nbk-equip-tag{fill:rgba(58,63,77,.08);}
        .nbk-lane-booked .nbk-equip-tag-text{fill:var(--muted);}
        .nbk-lg-booked .nbk-lg-swatch{background:repeating-linear-gradient(45deg,var(--line),var(--line) 3px,var(--line-2) 3px,var(--line-2) 6px);border:1.5px solid var(--line-2);}

        .nbk-selected-card{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:12px;}
        .nbk-selected-eyebrow{font-family:var(--fd);font-size:10px;font-weight:700;letter-spacing:0.12em;color:var(--accent);}
        .nbk-selected-title{font-family:var(--fd);font-weight:800;font-size:16px;color:var(--text);margin-top:3px;}
        .nbk-selected-meta{font-family:var(--fs);font-size:12px;font-weight:500;color:var(--muted);margin-top:3px;}
        .nbk-size-toggle{display:flex;width:100%;border:1px solid var(--line-2);border-radius:9px;overflow:hidden;}
        .nbk-size-btn{flex:1;padding:8px;font-family:var(--fd);font-weight:700;font-size:12px;background:var(--paper);color:var(--muted);border:none;cursor:pointer;transition:background .15s,color .15s;}
        .nbk-size-btn.on{background:var(--sky);color:#0A0A0A;}
      `}</style>
    </div>
  );
}

function LaneG({
  lane,
  assets,
  selectedAssetId,
  unavailable,
  onSelect,
}: {
  lane: Lane;
  assets: Asset[];
  selectedAssetId: string;
  unavailable: Set<string>;
  onSelect: (assetId: string) => void;
}) {
  const id = matchId(lane.candidates, assets);
  const disabled = id == null;
  const booked = id != null && unavailable.has(id);
  const selected = id != null && id === selectedAssetId && !booked;

  const cls =
    "nbk-lane" +
    (lane.gym ? " nbk-lane-gym" : "") +
    (lane.outdoor ? " nbk-lane-outdoor" : "") +
    (selected ? " nbk-selected" : "") +
    (booked ? " nbk-lane-booked" : "") +
    (disabled ? " nbk-lane-disabled" : "");

  return (
    <g className={cls} onClick={() => id && !booked && onSelect(id)}>
      <rect className="nbk-lane-rect" x={lane.x} y={lane.y} width={100} height={150} rx={6} />
      <text className={"nbk-lane-num" + (lane.small ? " nbk-lane-num-sm" : "")} x={lane.x + 18} y={lane.y + 32}>
        {lane.num}
      </text>
      {lane.equip?.map((tag, ti) => (
        <g key={ti}>
          <rect className="nbk-equip-tag" x={lane.x + 18} y={lane.y + 44 + ti * 18} width={tag.w} height={14} rx={3} />
          <text className="nbk-equip-tag-text" x={lane.x + 25} y={lane.y + 54 + ti * 18}>
            {tag.text}
          </text>
        </g>
      ))}
      {(booked || disabled) && (
        <text className="nbk-lane-status" x={lane.x + 18} y={lane.y + 142}>
          {booked ? "Booked" : "Not set up"}
        </text>
      )}
    </g>
  );
}
