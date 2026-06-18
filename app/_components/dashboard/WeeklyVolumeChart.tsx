"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeekVolume } from "@/lib/stats";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { AXIS_PROPS, CHART_COLORS, LEGEND_STYLE, TOOLTIP_STYLE } from "./chart-theme";

interface Props {
  data: WeekVolume[];
}

export default function WeeklyVolumeChart({ data }: Props) {
  const animate = !useReducedMotion();
  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <p className="eyebrow mb-3 px-1">Weekly volume</p>
      <div className="h-56 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} unit="km" width={48} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: CHART_COLORS.grid, opacity: 0.25 }}
              labelFormatter={(week) => `Week ${week}`}
              formatter={(value, name) => [
                typeof value === "number" ? `${value.toFixed(1)} km` : "—",
                name,
              ]}
            />
            <Legend wrapperStyle={LEGEND_STYLE} iconType="square" />
            <Bar dataKey="planned" name="Planned" fill={CHART_COLORS.planned} radius={[2, 2, 0, 0]} isAnimationActive={animate} />
            <Bar dataKey="actual" name="Actual" fill={CHART_COLORS.actual} radius={[2, 2, 0, 0]} isAnimationActive={animate} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
