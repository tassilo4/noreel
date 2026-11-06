import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useScreenTime, formatDuration } from '@/hooks/useScreenTime';
import { HeatmapChart } from '@/components/charts/heatmap-chart';

export default function HomeScreen() {
  const { logs, reload } = useScreenTime();

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const loggedDays = Object.keys(logs).sort();
  const remainder = loggedDays.length % 4;
  const padCount = remainder === 0 ? 0 : 4 - remainder;
  // Pad at start so the oldest (incomplete) row is at the bottom
  const paddedDays = [...Array(padCount).fill(null), ...loggedDays];
  // Chunk into rows of 4, then reverse so newest row is at the top
  const chunks: (string | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 4) chunks.push(paddedDays.slice(i, i + 4));
  chunks.reverse();
  const orderedDays = chunks.flat();
  const numRows = Math.max(1, chunks.length);

  const chartData = orderedDays.map((dateStr, i) => {
    const seconds = dateStr ? (logs[dateStr] ?? 0) : 0;
    const date = dateStr ? new Date(dateStr + 'T12:00:00') : null;
    const subLabel = date
      ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      : '';
    return {
      row: String(Math.floor(i / 4)),
      col: String(i % 4),
      value: seconds,
      label: seconds > 0 ? formatDuration(seconds) : '',
      subLabel,
    };
  });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, gap: 24 }}
      contentInsetAdjustmentBehavior='automatic'
    >
      <Pressable
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        onPress={() => router.navigate('/(tabs)/instagram')}
      >
        <View style={{ alignItems: 'center', width: 65, gap: 6 }}>
          <Image
            source={require('@/assets/images/Instagram_icon.png')}
            style={{ width: 65, height: 65, borderRadius: 15 }}
            contentFit='contain'
          />
          <Text style={{ fontSize: 12 }} numberOfLines={1}>Instagram</Text>
        </View>
      </Pressable>

      <View style={{ width: '100%', gap: 10 }}>
        <Text variant='body' style={{ fontWeight: '600' }}>Daily Usage</Text>
        <View style={{ width: '100%' }}>
          <HeatmapChart
            data={chartData}
            config={{ height: numRows * 85, padding: 4, showLabels: false, colorScale: ['#22c55e', '#f97316', '#ef4444'] }}
          />

        </View>
      </View>

    </ScrollView>
  );
}
