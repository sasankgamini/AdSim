export type Platform = "Meta" | "Google" | "TikTok" | "LinkedIn";

export const platforms: Platform[] = ["Meta", "Google", "TikTok", "LinkedIn"];

export function makeCtrHistogram(seed = 2) {
  // Deterministic pseudo-random distribution around ~1.6% with a tail.
  const bins = Array.from({ length: 14 }, (_, i) => {
    const ctr = 0.4 + i * 0.25; // percent
    const x = (i - 6.2) / 2.6;
    const base = Math.exp(-(x * x)) * 60;
    const tail = i > 9 ? (i - 9) * 8 : 0;
    const wobble = (Math.sin(i * 1.7 + seed) + 1) * 3;
    return {
      bucket: `${ctr.toFixed(2)}%`,
      ctr,
      count: Math.max(2, Math.round(base + wobble + tail)),
    };
  });
  return bins;
}

export function makeRoiPredictionSeries(seed = 4) {
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  return weeks.map((w) => {
    const trend = 1.1 + w * 0.12;
    const noise = (Math.sin((w + seed) * 0.9) * 0.18 + Math.cos(w * 0.45) * 0.08);
    const roi = Math.max(0.4, trend + noise);
    const band = 0.22 + Math.abs(Math.sin(w * 0.7)) * 0.12;
    return {
      week: `W${w}`,
      roi: Number(roi.toFixed(2)),
      low: Number((roi - band).toFixed(2)),
      high: Number((roi + band).toFixed(2)),
    };
  });
}

export function makePlatformComparison(seed = 1) {
  return platforms.map((p, i) => {
    const base = 50 + i * 7 + (Math.sin(seed + i * 1.2) + 1) * 4;
    const ctr = 0.9 + i * 0.22 + (Math.cos(seed + i * 1.1) + 1) * 0.07;
    const cvr = 1.3 + i * 0.18 + (Math.sin(seed + i * 0.8) + 1) * 0.09;
    return {
      platform: p,
      spend: Math.round(base * 100) / 100,
      ctr: Math.round(ctr * 100) / 100,
      cvr: Math.round(cvr * 100) / 100,
      roi: Math.round((1.0 + i * 0.14 + (Math.sin(i + seed) + 1) * 0.08) * 100) / 100,
    };
  });
}

export type Persona = {
  id: string;
  name: string;
  tagline: string;
  segment: string;
  intent: "Low" | "Medium" | "High";
  channels: Array<{ name: string; affinity: number }>;
};

export const personas: Persona[] = [
  {
    id: "p1",
    name: "Pragmatic Founder",
    tagline: "Wants clear ROI, fast iteration, and predictable CAC.",
    segment: "B2B SaaS",
    intent: "High",
    channels: [
      { name: "LinkedIn", affinity: 0.86 },
      { name: "Google", affinity: 0.74 },
      { name: "Meta", affinity: 0.42 },
      { name: "TikTok", affinity: 0.21 },
    ],
  },
  {
    id: "p2",
    name: "Value-Seeking Shopper",
    tagline: "Responds to proof, bundles, and time-limited deals.",
    segment: "E-commerce",
    intent: "Medium",
    channels: [
      { name: "Meta", affinity: 0.88 },
      { name: "TikTok", affinity: 0.76 },
      { name: "Google", affinity: 0.62 },
      { name: "LinkedIn", affinity: 0.18 },
    ],
  },
  {
    id: "p3",
    name: "Curious Creator",
    tagline: "Engages with playful creative + community social proof.",
    segment: "Creator Economy",
    intent: "Medium",
    channels: [
      { name: "TikTok", affinity: 0.9 },
      { name: "Meta", affinity: 0.68 },
      { name: "Google", affinity: 0.36 },
      { name: "LinkedIn", affinity: 0.25 },
    ],
  },
];

export const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const heatmapSlots = ["AM", "Mid", "PM", "Late"] as const;

export function makePersonaHeatmap(seed = 3) {
  // Values 0..1, shaped to have weekday peaks for B2B, weekend peaks for consumer.
  return heatmapDays.map((d, di) => {
    const dayFactor =
      d === "Sat" || d === "Sun"
        ? 0.78 + Math.sin(seed + di) * 0.06
        : 0.9 + Math.cos(seed + di * 0.8) * 0.06;
    return heatmapSlots.map((slot, si) => {
      const slotFactor =
        slot === "AM"
          ? 0.86
          : slot === "Mid"
            ? 1.0
            : slot === "PM"
              ? 0.92
              : 0.72;
      const wobble = (Math.sin(seed + di * 1.6 + si * 1.1) + 1) * 0.035;
      const v = Math.max(0, Math.min(1, dayFactor * slotFactor - 0.35 + wobble));
      return Number(v.toFixed(2));
    });
  });
}

