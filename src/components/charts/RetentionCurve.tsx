"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

/**
 * 가입 후 0~N구간 재방문율을 곡선으로 그린다. `rates[i]`는 i구간의 퍼센트 값이고
 * 0구간은 정의상 100%에서 시작한다. `prefix`로 축 라벨을 D(일)/W(주) 등으로 바꾼다.
 */
export function RetentionCurve({
  title,
  rates,
  prefix = "D",
}: {
  title: string;
  rates: number[];
  prefix?: string;
}) {
  const data = rates.map((rate, index) => ({ day: `${prefix}${index}`, value: Number(rate.toFixed(1)) }));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <p className="text-sm text-neutral-400">{title}</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#2c2c2a" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="day" stroke="#898781" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#898781"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={44}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ background: "#1a1a19", border: "1px solid #2c2c2a", borderRadius: 8 }}
              labelStyle={{ color: "#c3c2b7" }}
              itemStyle={{ color: "#ffffff" }}
              formatter={(value) => [`${value}%`, "재방문율"] as [string, string]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#199e70"
              strokeWidth={2}
              dot={{ r: 3, fill: "#199e70" }}
              activeDot={{ r: 4, stroke: "#1a1a19", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
