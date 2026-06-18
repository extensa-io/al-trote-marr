"use client";

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import type { EfficiencyPoint } from "@/lib/stats";
import { formatDayShort } from "@/lib/date";
import { AXIS_PROPS, CHART_COLORS, TOOLTIP_STYLE } from "./chart-theme";

const MIN_POINTS = 3;

interface Props {
  data: EfficiencyPoint[];
}

export default function AerobicEfficiencyChart({ data }: Props) {
  if (data.length < MIN_POINTS) {
    return (
      <section className="border border-line bg-panel rounded-md p-5">
        <p className="eyebrow mb-2">Aerobic efficiency</p>
        <p className="text-canvas-dim text-sm">
          Log {MIN_POINTS - data.length} more easy run{MIN_POINTS - data.length === 1 ? "" : "s"} with
          distance, duration, and HR to see the trend.
        </p>
      </section>
    );
  }

  const points = data.map((d) => ({
    x: Date.parse(d.date + "T00:00:00Z"),
    y: Number(d.efficiency.toFixed(4)),
    date: d.date,
  }));

  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <p className="eyebrow mb-3 px-1">Aerobic efficiency</p>
      <p className="font-mono text-canvas-dim text-[0.65rem] mb-2 px-1">m/s per beat · rising is better</p>
      <div className="h-56 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              {...AXIS_PROPS}
              tickFormatter={(ms: number) =>
                formatDayShort(new Date(ms).toISOString().slice(0, 10))
              }
              minTickGap={32}
            />
            <YAxis dataKey="y" type="number" domain={["auto", "auto"]} {...AXIS_PROPS} width={56} />
            <ZAxis range={[50, 50]} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ stroke: CHART_COLORS.grid, strokeDasharray: "3 3" }}
              formatter={(value) => [typeof value === "number" ? value.toFixed(4) : "—", "m/s · beat"]}
              labelFormatter={() => ""}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { date: string; y: number };
                return (
                  <div style={TOOLTIP_STYLE} className="px-2 py-1">
                    <div>{formatDayShort(p.date)}</div>
                    <div>{p.y.toFixed(4)} m/s · beat</div>
                  </div>
                );
              }}
            />
            <Scatter data={points} fill={CHART_COLORS.planned} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
