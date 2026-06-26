"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeightPoint } from "@/lib/stats";
import { formatDayShort } from "@/lib/date";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { AXIS_PROPS, CHART_COLORS } from "./chart-theme";

const MIN_POINTS = 2;

interface Props {
  data: WeightPoint[];
}

export default function WeightChart({ data }: Props) {
  const animate = !useReducedMotion();

  if (data.length < MIN_POINTS) {
    return (
      <section className="border border-line bg-panel rounded-md p-5">
        <p className="eyebrow mb-2">Weight</p>
        <p className="text-canvas-dim text-sm">
          Log weight on {MIN_POINTS - data.length} more session
          {MIN_POINTS - data.length === 1 ? "" : "s"} to see the trend.
        </p>
      </section>
    );
  }

  const points = data.map((d) => ({
    x: Date.parse(d.date + "T00:00:00Z"),
    y: d.weightKg,
    date: d.date,
  }));

  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <p className="eyebrow mb-3 px-1">Weight</p>
      <div className="h-56 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              {...AXIS_PROPS}
              tickFormatter={(ms: number) =>
                formatDayShort(new Date(ms).toISOString().slice(0, 10))
              }
              minTickGap={32}
            />
            <YAxis dataKey="y" type="number" domain={["auto", "auto"]} {...AXIS_PROPS} unit="kg" width={56} />
            <Tooltip
              cursor={{ stroke: CHART_COLORS.grid, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { date: string; y: number };
                return (
                  <div className="bg-raised border border-line rounded-md px-2 py-1 font-mono text-xs text-canvas">
                    <div>{formatDayShort(p.date)}</div>
                    <div>{p.y} kg</div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke={CHART_COLORS.planned}
              strokeWidth={2}
              dot={{ r: 2, fill: CHART_COLORS.planned }}
              isAnimationActive={animate}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
