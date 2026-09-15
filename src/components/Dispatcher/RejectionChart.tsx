import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { RejectionReportRow } from '../../types';
import { colors } from '../../theme/colors';

const HEIGHT = 230;
const TOP = 44;
const BOTTOM = 42;
const MIN_WIDTH = 280;

export function RejectionChart({ rows, selectedDate, onSelect }: { rows: RejectionReportRow[]; selectedDate?: string; onSelect: (date: string) => void }) {
  const [hovered, setHovered] = useState<string>();
  const [width, setWidth] = useState(MIN_WIDTH);
  const validRows = useMemo(() => rows.filter(row => typeof row.date === 'string' && Number.isFinite(row.rejectionCount)), [rows]);
  const max = Math.max(1, ...validRows.map(row => row.rejectionCount));
  const targetPoints = useMemo(() => {
    const plotWidth = Math.max(1, width - 48);
    const divisor = Math.max(1, validRows.length - 1);
    return validRows.map((row, index) => ({ ...row, date: row.date.slice(0, 10), x: 24 + index * plotWidth / divisor, y: TOP + (1 - row.rejectionCount / max) * (HEIGHT - TOP - BOTTOM) }));
  }, [validRows, max, width]);
  const [points, setPoints] = useState(targetPoints);
  const pointsRef = useRef(points);

  useEffect(() => {
    const previousByDate = new Map(pointsRef.current.map(point => [point.date, point]));
    const starts = targetPoints.map(target => previousByDate.get(target.date) ?? target);
    const duration = 450;
    const startedAt = Date.now();
    let frame = 0;

    const animate = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = targetPoints.map((target, index) => ({
        ...target,
        x: starts[index].x + (target.x - starts[index].x) * eased,
        y: starts[index].y + (target.y - starts[index].y) * eased,
      }));
      pointsRef.current = next;
      setPoints(next);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [targetPoints]);
  const hoveredPoint = points.find(point => point.date === hovered);
  const findNearestPoint = (locationX: number) => points.reduce((nearest, point) =>
    Math.abs(point.x - locationX) < Math.abs(nearest.x - locationX) ? point : nearest,
  points[0]);
  const pointerX = (event: { currentTarget: unknown; nativeEvent: { clientX: number; offsetX?: number } }) => {
    if (Platform.OS === 'web') {
      const element = event.currentTarget as HTMLElement;
      return event.nativeEvent.clientX - element.getBoundingClientRect().left;
    }
    return event.nativeEvent.offsetX ?? 0;
  };

  if (!validRows.length) return <Text style={styles.empty}>За выбранный период отказов нет</Text>;
  return <View style={styles.container} onLayout={event => setWidth(Math.max(MIN_WIDTH, event.nativeEvent.layout.width))}>
    <Pressable
      style={[styles.interactiveArea, Platform.OS === 'web' && ({ cursor: 'crosshair' } as never)]}
      onPointerMove={event => setHovered(findNearestPoint(pointerX(event)).date)}
      onPointerLeave={() => setHovered(undefined)}
      onPress={event => onSelect(hoveredPoint?.date ?? findNearestPoint(event.nativeEvent.locationX).date)}
    >
    <View style={styles.summary}>
      <Text style={styles.summaryText}>{hoveredPoint ? `${hoveredPoint.date} · Отказов: ${hoveredPoint.rejectionCount}` : 'Наведите на точку, чтобы увидеть количество отказов'}</Text>
    </View>
    <Svg width={width} height={HEIGHT}>
      <Line x1="24" y1={HEIGHT - BOTTOM} x2={width - 16} y2={HEIGHT - BOTTOM} stroke={colors.border} />
      <Polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.primary} strokeWidth="3" />
      {hoveredPoint ? <>
        <Line x1={hoveredPoint.x} y1={TOP} x2={hoveredPoint.x} y2={HEIGHT - BOTTOM} stroke={colors.warning} strokeWidth="1" strokeDasharray="4 4" />
        <Circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="10" fill="transparent" stroke={colors.warning} strokeWidth="3" />
      </> : null}
      {points.map(point => <Circle key={point.date} cx={point.x} cy={point.y} r={selectedDate === point.date ? 7 : 5} fill={selectedDate === point.date ? colors.error : colors.primary} stroke={colors.surface} strokeWidth="2" />)}
    </Svg>
    {points.map(point => <View key={point.date}>
      {(validRows.length <= 7 || point === points[points.length - 1] || points.indexOf(point) % 5 === 0) && <Text style={[styles.date, { left: point.x - 22 }]}>{point.date.slice(5)}</Text>}
    </View>)}
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, paddingVertical: 28, textAlign: 'center' },
  container: { width: '100%', height: HEIGHT, overflow: 'hidden' },
  interactiveArea: { width: '100%', height: HEIGHT },
  summary: { position: 'absolute', left: 24, top: 4, zIndex: 2, backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  summaryText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  date: { position: 'absolute', top: HEIGHT - BOTTOM + 10, width: 44, textAlign: 'center', fontSize: 10, color: colors.textMuted },
});
