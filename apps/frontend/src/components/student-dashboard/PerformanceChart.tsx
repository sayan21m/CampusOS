import React, { useEffect, useRef, useState } from "react";

export interface PerformancePoint {
  id: number | string;
  label: string;
  detail: string;
  value: number;
  caption: string;
}

interface PerformanceChartProps {
  points: PerformancePoint[];
  height?: number;
  valueSuffix?: string;
  ariaLabel: string;
}

const PADDING = { top: 16, right: 16, bottom: 34, left: 40 };
const Y_TICKS = [0, 25, 50, 75, 100];

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function PerformanceChart({
  points,
  height = 240,
  valueSuffix = "%",
  ariaLabel,
}: PerformanceChartProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(640);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0].contentRect.width);
      if (nextWidth > 0) {
        setWidth(nextWidth);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 1);
  const plotHeight = height - PADDING.top - PADDING.bottom;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: PADDING.left + (points.length > 1 ? index * step : plotWidth / 2),
    y: PADDING.top + plotHeight - (Math.min(Math.max(point.value, 0), 100) / 100) * plotHeight,
  }));

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x},${coord.y}`)
    .join(" ");
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords[coords.length - 1].x},${PADDING.top + plotHeight} L${coords[0].x},${PADDING.top + plotHeight} Z`
      : "";

  const average = points.length
    ? points.reduce((sum, point) => sum + point.value, 0) / points.length
    : 0;
  const averageY = PADDING.top + plotHeight - (average / 100) * plotHeight;

  const maxLabelChars = Math.max(6, Math.floor((step || plotWidth) / 7.5));
  const labelEvery = step > 0 && step < 56 ? Math.ceil(56 / step) : 1;

  function getLabelAnchor(index: number): "start" | "middle" | "end" {
    if (points.length < 2) {
      return "middle";
    }

    if (index === 0) {
      return "start";
    }

    return index === points.length - 1 ? "end" : "middle";
  }

  const active = activeIndex !== null ? points[activeIndex] : null;
  const activeCoord = activeIndex !== null ? coords[activeIndex] : null;
  const tooltipLeft = activeCoord
    ? Math.min(Math.max(activeCoord.x, 90), Math.max(width - 90, 90))
    : 0;

  return (
    <div className="sd-chart" ref={containerRef}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="sd-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f6b57" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0f6b57" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Y_TICKS.map((tick) => {
          const y = PADDING.top + plotHeight - (tick / 100) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                className="sd-chart-grid"
              />
              <text x={PADDING.left - 10} y={y + 4} textAnchor="end" className="sd-chart-axis">
                {tick}
                {valueSuffix}
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={averageY}
              y2={averageY}
              className="sd-chart-average"
            />
            <path d={areaPath} fill="url(#sd-chart-fill)" />
            <path d={linePath} className="sd-chart-line" />
          </>
        )}

        {activeCoord && (
          <line
            x1={activeCoord.x}
            x2={activeCoord.x}
            y1={PADDING.top}
            y2={PADDING.top + plotHeight}
            className="sd-chart-guide"
          />
        )}

        {coords.map((coord, index) => (
          <g key={points[index].id}>
            {index % labelEvery === 0 && (
              <text
                x={coord.x}
                y={height - 10}
                textAnchor={getLabelAnchor(index)}
                className="sd-chart-axis sd-chart-xlabel"
              >
                {truncate(
                  points[index].label,
                  getLabelAnchor(index) === "middle" ? maxLabelChars : Math.ceil(maxLabelChars / 2)
                )}
              </text>
            )}
            <rect
              x={coord.x - Math.max(step, 24) / 2}
              y={PADDING.top}
              width={Math.max(step, 24)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setActiveIndex(index)}
            />
            <circle
              cx={coord.x}
              cy={coord.y}
              r={activeIndex === index ? 6 : 4}
              className="sd-chart-point"
              tabIndex={0}
              role="button"
              aria-label={`${points[index].label}: ${points[index].caption}`}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onMouseEnter={() => setActiveIndex(index)}
            />
          </g>
        ))}
      </svg>

      {active && activeCoord && (
        <div
          className="sd-chart-tooltip"
          style={{ left: tooltipLeft, top: Math.max(activeCoord.y - 12, 0) }}
          role="status"
        >
          <p className="sd-chart-tooltip-title">{active.label}</p>
          <p className="sd-chart-tooltip-value">
            {active.value}
            {valueSuffix}
            <span>{active.caption}</span>
          </p>
          <p className="sd-chart-tooltip-detail">{active.detail}</p>
        </div>
      )}
    </div>
  );
}
