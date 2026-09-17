import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { AppText } from "@/components/AppText";
import type { StrengthTrendPoint } from "@/features/progress/services/progressMetrics";
import { colors, radius, spacing } from "@/theme";

export type StrengthTrendChartProps = {
  limited?: boolean;
  points: readonly StrengthTrendPoint[];
};

export function StrengthTrendChart({ limited = false, points }: StrengthTrendChartProps) {
  const [width, setWidth] = useState(0);
  const coordinates = chartCoordinates(points, width, chartHeight);
  return (
    <View accessibilityLabel="Estimated 1RM over time" style={styles.container}>
      <AppText variant="sectionHeading">Estimated 1RM Over Time</AppText>
      {limited ? <AppText color="muted" variant="metadata">Limited offline history</AppText> : null}
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={styles.chart}
        testID="strength-trend-plot"
      >
        {coordinates.slice(1).map((point, index) => {
          const previous = coordinates[index];
          const deltaX = point.x - previous.x;
          const deltaY = point.y - previous.y;
          const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
          const angle = Math.atan2(deltaY, deltaX);
          return (
            <View
              key={`line-${point.id}`}
              style={[
                styles.line,
                {
                  left: previous.x,
                  top: previous.y,
                  width: length,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
        {coordinates.map((point) => (
          <View
            accessibilityLabel={`${point.value.toFixed(1)} kg estimated 1RM on ${point.completedAt}`}
            key={point.id}
            style={[styles.point, { left: point.x - pointRadius, top: point.y - pointRadius }]}
          />
        ))}
      </View>
    </View>
  );
}

function chartCoordinates(
  points: readonly StrengthTrendPoint[],
  width: number,
  height: number,
): { completedAt: string; id: string; value: number; x: number; y: number }[] {
  if (points.length === 0 || width <= 0) return [];
  const values = points.map(({ estimated1RMKg }) => estimated1RMKg);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);
  return points.map((point, index) => ({
    completedAt: point.completedAt,
    id: `${point.workoutId}-${point.completedAt}`,
    value: point.estimated1RMKg,
    x: chartPadding + (points.length === 1 ? 0.5 : index / (points.length - 1)) * (width - chartPadding * 2),
    y: chartPadding + ((maximum - point.estimated1RMKg) / range) * (height - chartPadding * 2),
  }));
}

const chartHeight = 160;
const chartPadding = 16;
const pointRadius = 4;

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chart: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    borderWidth: 1,
    height: chartHeight,
    overflow: "hidden",
    position: "relative",
  },
  line: {
    backgroundColor: colors.accent.primary,
    height: 2,
    position: "absolute",
    transformOrigin: "left center",
  },
  point: {
    backgroundColor: colors.text.primary,
    borderColor: colors.accent.primary,
    borderRadius: pointRadius,
    borderWidth: 2,
    height: pointRadius * 2,
    position: "absolute",
    width: pointRadius * 2,
  },
});
