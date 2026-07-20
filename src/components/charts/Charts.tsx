"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

export const CHART_COLORS = [
  "#2f6bb0", // navy-blue
  "#2aa198", // teal
  "#e2984a", // amber
  "#7e6bd6", // violet
  "#4fae67", // green
  "#d16a6a", // red
  "#5fa8d3", // sky
  "#b58cc9", // lilac
];

const axisStyle = { fontSize: 12, fill: "var(--color-fg-faint)" };
const gridStroke = "var(--color-border)";

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-fg)",
  },
  labelStyle: { color: "var(--color-fg)", fontWeight: 600 },
};

export function ChartCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className ?? ""}`}>
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function TrendChart({ data, xKey, yKey, name, color = CHART_COLORS[0] }: {
  data: Record<string, unknown>[]; xKey: string; yKey: string; name: string; color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={52} />
        <Tooltip {...tooltipStyle} />
        <Area type="monotone" dataKey={yKey} name={name} stroke={color} strokeWidth={2.5} fill={`url(#grad-${yKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, xKey, bars, horizontal }: {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; name: string; color?: string }[];
  horizontal?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 6, right: 8, left: horizontal ? 8 : -12, bottom: 0 }}
      >
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={52} />
          </>
        )}
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--color-surface-2)" }} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={42}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const shown = data.filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={shown} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} strokeWidth={0}>
          {shown.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
