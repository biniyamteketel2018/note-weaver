export type Palette = {
  id: string;
  name: string;
  ink: string;
  paper: string;
  rule: string;
  accent: string;
  muted: string;
  soft: string;
  sage: string;
  crimson: string;
};

export const PALETTES: Palette[] = [
  {
    id: "editorial",
    name: "Editorial Cream",
    ink: "#1a2030",
    paper: "#fafaf6",
    rule: "#d8d4c8",
    accent: "#b08a3e",
    muted: "#5b6478",
    soft: "#f3efe4",
    sage: "#5d7a6b",
    crimson: "#8a2a2a",
  },
  {
    id: "midnight",
    name: "Midnight Scholar",
    ink: "#f5f1e8",
    paper: "#0f1320",
    rule: "#2a2f42",
    accent: "#d4a857",
    muted: "#9aa3b8",
    soft: "#1a2030",
    sage: "#7fa893",
    crimson: "#d97070",
  },
  {
    id: "oxford",
    name: "Oxford Blue",
    ink: "#0a1f3d",
    paper: "#f7f4ec",
    rule: "#c9d0dc",
    accent: "#a8431a",
    muted: "#516076",
    soft: "#eae3d2",
    sage: "#3d6655",
    crimson: "#7a1f1f",
  },
  {
    id: "botanical",
    name: "Botanical",
    ink: "#1f2a22",
    paper: "#f4f1e8",
    rule: "#cdd3c4",
    accent: "#7a8c3a",
    muted: "#5a6657",
    soft: "#e6e9d8",
    sage: "#4d7059",
    crimson: "#8a3a2a",
  },
  {
    id: "monochrome",
    name: "Pure Monochrome",
    ink: "#0a0a0a",
    paper: "#ffffff",
    rule: "#d4d4d4",
    accent: "#0a0a0a",
    muted: "#666666",
    soft: "#f0f0f0",
    sage: "#444444",
    crimson: "#000000",
  },
];

export const DEFAULT_PALETTE = PALETTES[0];
