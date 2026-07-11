"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function TrendLine({
  title,
  days,
  values,
}: {
  title: string;
  days: string[];
  values: number[];
}) {
  const data = days.map((day, index) => ({ day: day.slice(5), value: values[index] ?? 0 }));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <p className="text-sm text-neutral-400">{title}</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#2c2c2a" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="day" stroke="#898781" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#898781" fontSize={12} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "#1a1a19", border: "1px solid #2c2c2a", borderRadius: 8 }}
              labelStyle={{ color: "#c3c2b7" }}
              itemStyle={{ color: "#ffffff" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3987e5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#1a1a19", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
