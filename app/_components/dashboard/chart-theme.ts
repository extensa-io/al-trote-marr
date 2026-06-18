// Palette tokens mirrored from app/globals.css. Recharts SVG doesn't read CSS
// variables, so the chart layer holds its own copy.
export const CHART_COLORS = {
  planned: "#c49a4a", // brass
  actual: "#6e8a4e", // confirmed
  axis: "#a39c82", // canvas-dim
  grid: "#4a4f35", // line
  surface: "#3a3f29", // raised
  text: "#d8cdb0", // canvas
} as const;

export const AXIS_PROPS = {
  stroke: CHART_COLORS.axis,
  tick: { fill: CHART_COLORS.axis, fontSize: 11, fontFamily: "var(--font-mono)" },
  tickLine: { stroke: CHART_COLORS.axis },
  axisLine: { stroke: CHART_COLORS.grid },
} as const;

export const TOOLTIP_STYLE = {
  background: CHART_COLORS.surface,
  border: `1px solid ${CHART_COLORS.grid}`,
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: CHART_COLORS.text,
} as const;

export const LEGEND_STYLE = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
  color: CHART_COLORS.axis,
};
