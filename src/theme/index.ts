/**
 * Runtime palette for charts or programmatic use (ECharts, Recharts, Canvas).
 * Hex values mirror src/theme/tokens.css — update both when the brand guide changes.
 */
export const ironIntelligencePalette = {
  surfaces: {
    app: "#050607",
    header: "#08090b",
    card: "#1a1b1f",
    panel: "#18191d",
  },
  semantic: {
    critical: "#ff3b45",
    high: "#ff7a1a",
    medium: "#facc15",
    low: "#22c55e",
    info: "#00d9ff",
    accepted: "#2563eb",
  },
  chart: {
    grid: "rgba(80, 100, 130, 0.28)",
    axis: "#8ea0b8",
  },
} as const;

export type IronChartSeriesKey = keyof typeof ironIntelligencePalette.semantic;
