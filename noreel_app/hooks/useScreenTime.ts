import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import * as StoreReview from 'expo-store-review';

const STORAGE_KEY = 'screentime_logs';
const MILESTONES_KEY = 'screentime_milestones';
const MILESTONES = [600, 3600, 36000]; // 10m, 1h, 10h in seconds

export async function checkMilestones(addedSeconds: number) {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const logs: Record<string, number> = raw ? JSON.parse(raw) : {};
  const total = Object.values(logs).reduce((sum, s) => sum + s, 0) + addedSeconds;

  const mRaw = await AsyncStorage.getItem(MILESTONES_KEY);
  const triggered: number[] = mRaw ? JSON.parse(mRaw) : [];

  for (const milestone of MILESTONES) {
    if (total >= milestone && !triggered.includes(milestone)) {
      triggered.push(milestone);
      await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(triggered));
      await StoreReview.requestReview();
      break; // one prompt at a time
    }
  }
}

export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function useScreenTime() {
  const [logs, setLogs] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) setLogs(JSON.parse(raw));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTime = useCallback(async (seconds: number) => {
    if (seconds <= 0) return;
    const key = todayKey();
    setLogs((prev) => {
      const updated = { ...prev, [key]: (prev[key] ?? 0) + seconds };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { logs, addTime, reload: load };
}
