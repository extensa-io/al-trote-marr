"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CumulativePoint } from "@/lib/stats";
import { formatDayShort } from "@/lib/date";
import { AXIS_PROPS, CHART_COLORS, LEGEND_STYLE, TOOLTIP_STYLE } from "./chart-theme";

interface Props {
  data: CumulativePoint[];
}

export default function CumulativeChart({ data }: Props) {
  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <p className="eyebrow mb-3 px-1">Cumulative km</p>
      <div className="h-56 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={(d: string) => formatDayShort(d)}
              minTickGap={32}
            />
            <YAxis {...AXIS_PROPS} unit="km" width={48} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(d: string) => formatDayShort(d)}
              formatter={(value, name) => [
                typeof value === "number" ? `${value.toFixed(1)} km` : "—",
                name,
              ]}
            />
            <Legend wrapperStyle={LEGEND_STYLE} iconType="square" />
            <Line
              type="monotone"
              dataKey="planned"
              name="Planned"
              stroke={CHART_COLORS.planned}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke={CHART_COLORS.actual}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
