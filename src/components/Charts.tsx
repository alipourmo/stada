"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const BASE_TOOLTIP = {
  backgroundColor: "#0f172a",
  borderColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  titleColor: "#e2e8f0",
  bodyColor: "#cbd5e1",
  cornerRadius: 9,
  padding: 10,
  titleFont: { family: "Vazirmatn, sans-serif", size: 12 },
  bodyFont: { family: "Vazirmatn, sans-serif", size: 12 },
};

export interface SubjectSeries {
  label: string;
  color: string;
  data: number[];
}

export function StackedSubjectTimelineChart({
  labels,
  series,
  unitLabel = "دقیقه",
}: {
  labels: string[];
  series: SubjectSeries[];
  unitLabel?: string;
}) {
  return (
    <div className="relative h-[245px] w-full">
      <Bar
        data={{
          labels,
          datasets: series.map((s) => ({
            label: s.label,
            data: s.data,
            backgroundColor: `${s.color}cc`,
            hoverBackgroundColor: s.color,
            borderColor: s.color,
            borderWidth: 1,
            borderRadius: 4,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: series.length > 0,
              position: "top",
              labels: {
                color: "#cbd5e1",
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                pointStyle: "circle",
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
            tooltip: {
              ...BASE_TOOLTIP,
              callbacks: {
                label: (ctx) =>
                  ` ${ctx.dataset.label}: ${ctx.parsed.y ?? 0} ${unitLabel}`,
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { color: "rgba(255,255,255,0.04)" },
              ticks: {
                color: "#64748b",
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: "rgba(255,255,255,0.04)" },
              ticks: {
                color: "#64748b",
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
          },
        }}
      />
    </div>
  );
}

export function SubjectDoughnutChart({
  items,
  unitLabel = "دقیقه",
}: {
  items: { name: string; color: string; value: number }[];
  unitLabel?: string;
}) {
  const nonZero = items.filter((i) => i.value > 0);
  if (nonZero.length === 0) {
    return (
      <div className="flex h-[245px] items-center justify-center text-xs text-slate-500">
        هنوز داده‌ای در این بازه زمانی ثبت نشده است
      </div>
    );
  }

  return (
    <div className="relative h-[245px] w-full">
      <Doughnut
        data={{
          labels: nonZero.map((i) => i.name),
          datasets: [
            {
              data: nonZero.map((i) => i.value),
              backgroundColor: nonZero.map((i) => `${i.color}dd`),
              hoverBackgroundColor: nonZero.map((i) => i.color),
              borderColor: "#0a0f1e",
              borderWidth: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: "#cbd5e1",
                boxWidth: 11,
                boxHeight: 11,
                usePointStyle: true,
                pointStyle: "circle",
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
            tooltip: {
              ...BASE_TOOLTIP,
              callbacks: {
                label: (ctx) =>
                  ` ${ctx.label}: ${ctx.parsed} ${unitLabel}`,
              },
            },
          },
        }}
      />
    </div>
  );
}

export function SubjectColorBarChart({
  items,
  unitLabel,
}: {
  items: { name: string; color: string; value: number }[];
  unitLabel: string;
}) {
  return (
    <div className="relative h-[225px] w-full">
      <Bar
        data={{
          labels: items.map((i) => i.name),
          datasets: [
            {
              label: unitLabel,
              data: items.map((i) => i.value),
              backgroundColor: items.map((i) => `${i.color}cc`),
              hoverBackgroundColor: items.map((i) => i.color),
              borderColor: items.map((i) => i.color),
              borderWidth: 1.5,
              borderRadius: 6,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...BASE_TOOLTIP,
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y ?? 0} ${unitLabel}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(255,255,255,0.04)" },
              ticks: {
                color: "#94a3b8",
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(255,255,255,0.04)" },
              ticks: {
                color: "#64748b",
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
          },
        }}
      />
    </div>
  );
}

export function TestAccuracyTrendChart({
  points,
}: {
  points: {
    label: string;
    accuracy: number;
    subjectName: string;
    color: string;
  }[];
}) {
  return (
    <div className="relative h-[225px] w-full">
      <Line
        data={{
          labels: points.map((p) => p.label),
          datasets: [
            {
              label: "دقت تست",
              data: points.map((p) => p.accuracy),
              borderColor: "#00d4ff",
              backgroundColor: "rgba(0, 212, 255, 0.1)",
              borderWidth: 2,
              pointBackgroundColor: points.map((p) => p.color),
              pointBorderColor: "#0f172a",
              pointBorderWidth: 1.5,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              tension: 0.35,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...BASE_TOOLTIP,
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? 0;
                  const pt = points[idx];
                  return pt ? `${pt.subjectName} (${pt.label})` : "";
                },
                label: (ctx) => ` دقت: ${ctx.parsed.y ?? 0}%`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(255,255,255,0.04)" },
              ticks: {
                color: "#64748b",
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: "rgba(255,255,255,0.04)" },
              ticks: {
                color: "#64748b",
                callback: (val) => `${val}%`,
                font: { family: "Vazirmatn, sans-serif", size: 11 },
              },
            },
          },
        }}
      />
    </div>
  );
}
