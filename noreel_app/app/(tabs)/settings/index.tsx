import { Linking, Pressable, Switch } from 'react-native';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useSettings } from '@/providers/settings-context';
import { useColor } from '@/hooks/useColor';
import { useModeToggle } from '@/hooks/useModeToggle';

export default function SettingsScreen() {
  const { hideSponsored, setHideSponsored, hideExploreGrid, setHideExploreGrid } = useSettings();
  const { toggleMode, isDark } = useModeToggle();
  const accent = useColor('primary');
  const card = useColor('card');
  const cardForeground = useColor('cardForeground');
  const [reviewUsed, setReviewUsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('review_requested').then((val) => {
      if (val === 'true') setReviewUsed(true);
    });
  }, []);

  async function handleReview() {
    if (reviewUsed) return;
    await StoreReview.requestReview();
    await AsyncStorage.setItem('review_requested', 'true');
    setReviewUsed(true);
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        gap: 18,
        paddingTop: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant='body' style={{ fontWeight: '600' }}>Dark mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleMode}
            trackColor={{ true: accent }}
          />
        </View>
      </View>

      <View style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant='body' style={{ fontWeight: '600' }}>Hide sponsored posts</Text>
            <Text variant='caption' style={{ opacity: 0.6 }}>Remove ads from your feed</Text>
          </View>
          <Switch
            value={hideSponsored}
            onValueChange={setHideSponsored}
            trackColor={{ true: accent }}
          />
        </View>
      </View>

      <View style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant='body' style={{ fontWeight: '600' }}>Hide explore grid</Text>
            <Text variant='caption' style={{ opacity: 0.6 }}>Keep search, remove suggested content</Text>
          </View>
          <Switch
            value={hideExploreGrid}
            onValueChange={setHideExploreGrid}
            trackColor={{ true: accent }}
          />
        </View>
      </View>

      <Pressable
        onPress={handleReview}
        disabled={reviewUsed}
        style={({ pressed }) => ({ width: '100%', opacity: reviewUsed ? 0.4 : pressed ? 0.7 : 1 })}
      >
        <View style={{ borderRadius: 16, backgroundColor: card, paddingHorizontal: 20, paddingVertical: 18, gap: 4 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: cardForeground }}>Leave us a review ⭐</Text>
          <Text style={{ fontSize: 13, color: cardForeground, opacity: 0.6 }}>
            {reviewUsed ? 'Thanks for your feedback!' : "We'd love to hear your feedback"}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => Linking.openURL('https://example.com/contact')}
        style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ borderRadius: 16, backgroundColor: card, paddingHorizontal: 20, paddingVertical: 18, gap: 4 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: cardForeground }}>Contact us 💬</Text>
          <Text style={{ fontSize: 13, color: cardForeground, opacity: 0.6 }}>Get in touch with the team</Text>
        </View>
      </Pressable>
      <Text variant='caption' style={{ textAlign: 'center', opacity: 0.4, paddingHorizontal: 16 }}>
        🔒 Noreel collects no data. Everything stays on your device.
      </Text>
    </ScrollView>
  );
}
