"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend
);

const BASE_TOOLTIP = {
  backgroundColor: "#0f172a",
  borderColor: "rgba(255,255,255,0.12)",
  borderWidth: 1,
  titleColor: "#e2e8f0",
  bodyColor: "#94a3b8",
  cornerRadius: 8,
  padding: 10,
  titleFont: { family: "Vazirmatn, sans-serif", size: 12 },
  bodyFont: { family: "Vazirmatn, sans-serif", size: 12 },
};

export function WeeklyStudyBarChart({
  labels,
  data,
}: {
  labels: string[];
  data: number[];
}) {
  return (
    <div className="relative h-[210px] w-full">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "دقیقه مطالعه",
              data,
              backgroundColor: "rgba(0, 255, 163, 0.55)",
              hoverBackgroundColor: "rgba(0, 255, 163, 0.85)",
              borderColor: "#00ffa3",
              borderWidth: 1,
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
                label: (ctx) => ` ${ctx.parsed.y ?? 0} دقیقه`,
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

export function TestAccuracyLineChart({
  labels,
  data,
}: {
  labels: string[];
  data: number[];
}) {
  return (
    <div className="relative h-[210px] w-full">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "دقت تست",
              data,
              borderColor: "#ff6b9d",
              backgroundColor: "rgba(255, 107, 157, 0.12)",
              borderWidth: 2.5,
              pointBackgroundColor: "#ff6b9d",
              pointBorderColor: "#0f172a",
              pointBorderWidth: 1.5,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.38,
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

export function SubjectMasteryRadarChart({
  labels,
  data,
}: {
  labels: string[];
  data: number[];
}) {
  return (
    <div className="relative h-[250px] w-full">
      <Radar
        data={{
          labels,
          datasets: [
            {
              label: "دقیقه مطالعه",
              data,
              borderColor: "#00ffa3",
              backgroundColor: "rgba(0, 255, 163, 0.14)",
              borderWidth: 2,
              pointBackgroundColor: "#00ffa3",
              pointRadius: 4,
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
                label: (ctx) => ` ${ctx.parsed.r ?? 0} دقیقه`,
              },
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              grid: { color: "rgba(255,255,255,0.07)" },
              angleLines: { color: "rgba(255,255,255,0.07)" },
              pointLabels: {
                color: "#94a3b8",
                font: { family: "Vazirmatn, sans-serif", size: 12 },
              },
              ticks: { display: false },
            },
          },
        }}
      />
    </div>
  );
}
