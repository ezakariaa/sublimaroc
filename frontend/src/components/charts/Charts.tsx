import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import {
  VIZ,
  useContainerWidth,
  niceTicks,
  formatCompact,
  topRoundedRect,
  rightRoundedRect,
  donutArc,
} from './chartUtils';
import './charts.css';

export interface Serie {
  name: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/* Carte porteuse : titre, légende, bascule vue tableau                */
/* ------------------------------------------------------------------ */

interface ChartCardProps {
  title: string;
  subtitle?: string;
  legend?: Serie[];
  table?: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  legend,
  table,
  isEmpty,
  emptyMessage = 'Aucune donnée sur cette période',
  children,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className="viz-card">
      <Card.Body>
        <div className="viz-head">
          <div>
            <div className="viz-title">{title}</div>
            {subtitle && <p className="viz-subtitle">{subtitle}</p>}
          </div>
          {table && !isEmpty && (
            <button
              type="button"
              className={`viz-toggle ${showTable ? 'active' : ''}`}
              onClick={() => setShowTable((v) => !v)}
              title={showTable ? 'Afficher le graphique' : 'Afficher les données'}
              aria-label={showTable ? 'Afficher le graphique' : 'Afficher les données'}
            >
              <i className={`bi ${showTable ? 'bi-bar-chart' : 'bi-table'}`}></i>
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="viz-empty">
            <i className="bi bi-inbox"></i>
            {emptyMessage}
          </div>
        ) : showTable ? (
          <div className="viz-table-wrap">{table}</div>
        ) : (
          <>
            {legend && legend.length > 1 && (
              <div className="viz-legend">
                {legend.map((s) => (
                  <span className="viz-legend-item" key={s.name}>
                    <span className="viz-legend-swatch" style={{ background: s.color }}></span>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
            {children}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Colonnes empilées — évolution dans le temps                         */
/* ------------------------------------------------------------------ */

interface StackedColumnChartProps {
  data: { label: string; fullLabel?: string; values: number[] }[];
  series: Serie[];
  formatValue: (value: number) => string;
}

export const StackedColumnChart: React.FC<StackedColumnChartProps> = ({ data, series, formatValue }) => {
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const PAD_TOP = 22;
  const PAD_RIGHT = 6;
  const PAD_LEFT = 52;
  const PLOT_H = 210;
  const AXIS_H = 26;
  const GAP = 2; // écart de surface entre segments empilés

  if (width === 0) return <div className="viz-plot" ref={ref} style={{ height: PLOT_H + AXIS_H + PAD_TOP }} />;

  const plotW = Math.max(10, width - PAD_LEFT - PAD_RIGHT);
  const totals = data.map((d) => d.values.reduce((sum, v) => sum + v, 0));
  const ticks = niceTicks(Math.max(...totals, 0));
  const maxTick = ticks[ticks.length - 1];
  const maxIndex = totals.indexOf(Math.max(...totals));

  const band = plotW / Math.max(data.length, 1);
  const barW = Math.min(24, band * 0.55);
  const yOf = (value: number) => PAD_TOP + PLOT_H - (value / maxTick) * PLOT_H;
  const xOf = (index: number) => PAD_LEFT + band * index + (band - barW) / 2;

  // Une étiquette sur deux si l'espace manque
  const labelStep = band < 34 ? 2 : 1;

  return (
    <div className="viz-plot" ref={ref}>
      <svg width={width} height={PAD_TOP + PLOT_H + AXIS_H} role="img" aria-label="Colonnes empilées par mois">
        {/* Grille et graduations */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={width - PAD_RIGHT}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke={tick === 0 ? VIZ.axis : VIZ.grid}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yOf(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill={VIZ.inkMuted}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCompact(tick)}
            </text>
          </g>
        ))}

        {/* Colonnes empilées */}
        {data.map((d, i) => {
          let cursor = 0;
          const stack = d.values.map((value, s) => {
            const y0 = yOf(cursor);
            cursor += value;
            const y1 = yOf(cursor);
            const isTop = d.values.slice(s + 1).every((v) => v === 0);
            const hasBelow = d.values.slice(0, s).some((v) => v > 0);
            const gap = hasBelow ? GAP : 0;
            return { value, y: y1 + gap, h: Math.max(0, y0 - y1 - gap), color: series[s].color, isTop };
          });

          return (
            <g key={d.fullLabel || d.label}>
              {stack.map(
                (seg, s) =>
                  seg.value > 0 && (
                    <path
                      key={s}
                      d={
                        seg.isTop
                          ? topRoundedRect(xOf(i), seg.y, barW, seg.h, 4)
                          : `M${xOf(i)},${seg.y} h${barW} v${seg.h} h${-barW} Z`
                      }
                      fill={seg.color}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  )
              )}
              <text
                x={PAD_LEFT + band * i + band / 2}
                y={PAD_TOP + PLOT_H + 17}
                textAnchor="middle"
                fontSize={11}
                fill={VIZ.inkMuted}
              >
                {i % labelStep === 0 ? d.label : ''}
              </text>
            </g>
          );
        })}

        {/* Étiquette directe : uniquement le mois le plus élevé */}
        {totals[maxIndex] > 0 && (
          <text
            x={PAD_LEFT + band * maxIndex + band / 2}
            y={yOf(totals[maxIndex]) - 8}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={VIZ.inkSecondary}
          >
            {formatCompact(totals[maxIndex])}
          </text>
        )}

        {/* Zones de survol : toute la hauteur de la bande */}
        {data.map((d, i) => (
          <rect
            key={`hit-${d.fullLabel || d.label}`}
            x={PAD_LEFT + band * i}
            y={PAD_TOP}
            width={band}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="viz-tooltip"
          style={{
            left: Math.min(Math.max(PAD_LEFT + band * hover + band / 2, 80), width - 80),
            top: Math.max(yOf(totals[hover]), 88),
          }}
        >
          <div className="viz-tooltip-title">{data[hover].fullLabel || data[hover].label}</div>
          {series.map((s, i) => (
            <div className="viz-tooltip-row" key={s.name}>
              <span className="viz-legend-swatch" style={{ background: s.color }}></span>
              {s.name}
              <span className="viz-tooltip-value">{formatValue(data[hover].values[i])}</span>
            </div>
          ))}
          {series.length > 1 && (
            <div className="viz-tooltip-row viz-tooltip-total">
              Total
              <span className="viz-tooltip-value">{formatValue(totals[hover])}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Barres horizontales — classement                                    */
/* ------------------------------------------------------------------ */

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  formatValue: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, color = VIZ.series[0], formatValue }) => {
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const ROW_H = 40;
  const BAR_H = 18;
  const height = data.length * ROW_H;

  if (width === 0) return <div className="viz-plot" ref={ref} style={{ height }} />;

  const labelW = Math.min(150, Math.max(90, width * 0.32));
  const valueW = 92;
  const trackW = Math.max(10, width - labelW - valueW);
  const max = Math.max(...data.map((d) => d.value), 1);

  const truncate = (text: string, chars: number) =>
    text.length > chars ? `${text.slice(0, chars - 1)}…` : text;

  return (
    <div className="viz-plot" ref={ref}>
      <svg width={width} height={height} role="img" aria-label="Barres horizontales de classement">
        {data.map((d, i) => {
          const y = i * ROW_H + (ROW_H - BAR_H) / 2;
          const barW = Math.max(2, (d.value / max) * trackW);
          return (
            <g
              key={d.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            >
              <rect x={0} y={i * ROW_H} width={width} height={ROW_H} fill="transparent" />
              <text x={0} y={y + BAR_H / 2 + 4} fontSize={12} fill={VIZ.inkSecondary}>
                {truncate(d.label, Math.floor(labelW / 7))}
              </text>
              <path
                d={rightRoundedRect(labelW, y, barW, BAR_H, 4)}
                fill={color}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <text
                x={labelW + barW + 8}
                y={y + BAR_H / 2 + 4}
                fontSize={12}
                fontWeight={600}
                fill={VIZ.inkSecondary}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Anneau — répartition en parts d'un tout (≤ 6 segments)              */
/* ------------------------------------------------------------------ */

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  centerLabel: string;
  formatValue: (value: number) => string;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, centerLabel, formatValue }) => {
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const size = Math.max(160, Math.min(width || 220, 230));
  if (width === 0) return <div className="viz-plot" ref={ref} style={{ height: size }} />;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = width / 2;
  const cy = size / 2;
  const rOuter = Math.min(size / 2, width / 2) - 4;
  const rInner = rOuter * 0.64;
  const gapAngle = total > 0 && data.length > 1 ? 2 / rOuter : 0; // écart de surface de 2 px

  let angle = 0;
  const segments = data.map((d, i) => {
    const sweep = total > 0 ? (d.value / total) * Math.PI * 2 : 0;
    const start = angle + gapAngle / 2;
    const end = angle + sweep - gapAngle / 2;
    angle += sweep;
    return { ...d, index: i, start, end: Math.max(start, end), share: total > 0 ? d.value / total : 0 };
  });

  return (
    <div className="viz-plot" ref={ref}>
      <svg width={width} height={size} role="img" aria-label="Répartition en anneau">
        {segments.map((seg) => (
          <path
            key={seg.label}
            d={donutArc(cx, cy, rOuter, rInner, seg.start, seg.end)}
            fill={seg.color}
            opacity={hover === null || hover === seg.index ? 1 : 0.45}
            onMouseEnter={() => setHover(seg.index)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" className="viz-donut-center-value">
          {formatValue(total)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="viz-donut-center-label">
          {centerLabel}
        </text>
      </svg>

      {/* Étiquettes visibles : la couleur ne porte jamais seule l'information */}
      <div className="viz-legend mt-3 mb-0 flex-column">
        {segments.map((seg) => (
          <span
            className="viz-legend-item w-100"
            key={seg.label}
            onMouseEnter={() => setHover(seg.index)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="viz-legend-swatch" style={{ background: seg.color }}></span>
            {seg.label}
            <span className="ms-auto" style={{ color: VIZ.ink, fontVariantNumeric: 'tabular-nums' }}>
              {formatValue(seg.value)} · {Math.round(seg.share * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sparkline — tendance dans une tuile de statistique                  */
/* ------------------------------------------------------------------ */

export const Sparkline: React.FC<{ values: number[]; color?: string }> = ({
  values,
  color = VIZ.series[0],
}) => {
  const W = 108;
  const H = 30;
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * (W - 6) + 3;
  const y = (v: number) => H - 4 - ((v - min) / span) * (H - 10);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  return (
    <svg width={W} height={H} role="img" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.45}
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r={4}
        fill={color}
        stroke={VIZ.surface}
        strokeWidth={2}
      />
    </svg>
  );
};
