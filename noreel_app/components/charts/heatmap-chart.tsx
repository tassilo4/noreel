import { useColor } from '@/hooks/useColor';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

// Animated SVG Components
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Utility functions
const interpolateColor = (
  color1: string,
  color2: string,
  factor: number
): string => {
  // Simple color interpolation between two hex colors
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const getHeatmapColor = (
  value: number,
  minValue: number,
  maxValue: number,
  colorScale: string[]
): string => {
  if (maxValue === minValue) return colorScale[0];

  const normalizedValue = (value - minValue) / (maxValue - minValue);
  const segmentSize = 1 / (colorScale.length - 1);
  const segmentIndex = Math.floor(normalizedValue / segmentSize);
  const segmentProgress = (normalizedValue % segmentSize) / segmentSize;

  if (segmentIndex >= colorScale.length - 1) {
    return colorScale[colorScale.length - 1];
  }

  return interpolateColor(
    colorScale[segmentIndex],
    colorScale[segmentIndex + 1],
    segmentProgress
  );
};

interface ChartConfig {
  width?: number;
  height?: number;
  padding?: number;
  showLabels?: boolean;
  animated?: boolean;
  duration?: number;
  colorScale?: string[];
}

interface HeatmapDataPoint {
  row: string | number;
  col: string | number;
  value: number;
  label?: string;
  subLabel?: string;
}

type Props = {
  data: HeatmapDataPoint[];
  config?: ChartConfig;
  style?: ViewStyle;
};

const SUBLABEL_HEIGHT = 18;

function HeatmapCell({
  x, y, width, rectHeight, fill, delay, duration, label, subLabel, showLabel, textColor, isEmpty, mutedColor,
}: {
  x: number; y: number; width: number; rectHeight: number; fill: string; delay: number; duration: number;
  label: string; subLabel: string; showLabel: boolean; textColor: string; minValue: number; maxValue: number; value: number; isEmpty: boolean; mutedColor: string;
}) {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withTiming(1, { duration });
  }, []);

  const cellAnimatedProps = useAnimatedProps(() => ({
    opacity: withDelay(delay, withTiming(animationProgress.value, { duration: 300 })),
  }));

  return (
    <G>
      <AnimatedRect x={x} y={y} width={width} height={rectHeight} fill={fill} rx={4} animatedProps={cellAnimatedProps} />
      {showLabel && !isEmpty && (
        <SvgText x={x + width / 2} y={y + rectHeight / 2 + 5} textAnchor='middle' fontSize={Math.min(14, width / 4)} fill={textColor} fontWeight='600'>
          {label}
        </SvgText>
      )}
      {showLabel && subLabel ? (
        <SvgText x={x + width / 2} y={y + rectHeight + SUBLABEL_HEIGHT - 3} textAnchor='middle' fontSize={12} fill={mutedColor}>
          {subLabel}
        </SvgText>
      ) : null}
    </G>
  );
}

export const HeatmapChart = ({ data, config = {}, style }: Props) => {
  const [containerWidth, setContainerWidth] = useState(300);

  const {
    height = 200,
    padding = 20,
    showLabels = true,
    animated = true,
    duration = 1000,
    colorScale = ['#e0f2fe', '#0369a1', '#1e3a8a'], // Light blue to dark blue
  } = config;

  // Use measured width or fallback to config width or default
  const chartWidth = containerWidth || config.width || 300;

  const mutedColor = useColor('mutedForeground');
  const textColor = useColor('foreground');
  const emptyColor = useColor('border');

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: measuredWidth } = event.nativeEvent.layout;
    if (measuredWidth > 0) {
      setContainerWidth(measuredWidth);
    }
  };


  if (!data.length) return null;

  // Calculate grid dimensions
  const uniqueRows = [...new Set(data.map((d) => d.row))].sort();
  const uniqueCols = [...new Set(data.map((d) => d.col))].sort();
  const numRows = uniqueRows.length;
  const numCols = uniqueCols.length;

  // Calculate value range only from days with actual data
  const nonZeroValues = data.map((d) => d.value).filter((v) => v > 0);
  const minValue = nonZeroValues.length ? Math.min(...nonZeroValues) : 0;
  const maxValue = nonZeroValues.length ? Math.max(...nonZeroValues) : 1;

  const innerChartWidth = chartWidth - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate cell dimensions with spacing
  const cellSpacing = 2;
  const cellWidth = (innerChartWidth - (numCols - 1) * cellSpacing) / numCols;
  const cellTotalHeight = (chartHeight - (numRows - 1) * cellSpacing) / numRows;
  const cellHeight = cellTotalHeight; // kept for row label positioning
  const rectHeight = cellTotalHeight - SUBLABEL_HEIGHT;

  // Create a map for quick data lookup
  const dataMap = new Map<string, HeatmapDataPoint>();
  data.forEach((point) => {
    dataMap.set(`${point.row}-${point.col}`, point);
  });

  return (
    <View style={[{ width: '100%', height }, style]} onLayout={handleLayout}>
      <Svg width={chartWidth} height={height}>
        {uniqueRows.map((row, rowIndex) =>
          uniqueCols.map((col, colIndex) => {
            const point = dataMap.get(`${row}-${col}`);
            const value = point?.value || 0;
            const x = padding + colIndex * (cellWidth + cellSpacing);
            const y = padding + rowIndex * (cellHeight + cellSpacing);
            const isEmpty = value === 0;
            const cellColor = isEmpty ? emptyColor : getHeatmapColor(value, minValue, maxValue, colorScale);
            const labelText = point ? (point.label ?? value.toString()) : '';
            const subLabelText = point?.subLabel ?? '';
            const labelFill = value > (minValue + maxValue) / 2 ? '#ffffff' : textColor;
            return (
              <HeatmapCell
                key={`cell-${row}-${col}`}
                x={x} y={y} width={cellWidth} rectHeight={rectHeight}
                fill={cellColor}
                delay={(rowIndex * numCols + colIndex) * 50}
                duration={duration}
                label={labelText}
                subLabel={subLabelText}
                showLabel={cellWidth > 30 && rectHeight > 20}
                textColor={labelFill}
                mutedColor={mutedColor}
                minValue={minValue} maxValue={maxValue} value={value}
                isEmpty={isEmpty}
              />
            );
          })
        )}

        {/* Row labels */}
        {showLabels && (
          <G>
            {uniqueRows.map((row, rowIndex) => (
              <SvgText
                key={`row-label-${row}`}
                x={padding - 8}
                y={
                  padding +
                  rowIndex * (cellHeight + cellSpacing) +
                  cellHeight / 2 +
                  4
                }
                textAnchor='end'
                fontSize={12}
                fill={mutedColor}
              >
                {row}
              </SvgText>
            ))}
          </G>
        )}

        {/* Column labels */}
        {showLabels && (
          <G>
            {uniqueCols.map((col, colIndex) => (
              <SvgText
                key={`col-label-${col}`}
                x={
                  padding + colIndex * (cellWidth + cellSpacing) + cellWidth / 2
                }
                y={height - 5}
                textAnchor='middle'
                fontSize={12}
                fill={mutedColor}
              >
                {col}
              </SvgText>
            ))}
          </G>
        )}
      </Svg>
    </View>
  );
};
