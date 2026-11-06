import { Platform, useColorScheme } from 'react-native';
import { useColor } from '@/hooks/useColor';
import MaterialIcons from '@expo/vector-icons/Feather';
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';
import { SettingsProvider } from '@/providers/settings-context';

export default function TabsLayout() {
  const tabDefault = useColor('tabIconDefault');
  const tabSelected = useColor('tabIconSelected');
  const colorScheme = useColorScheme();

  return (
    <SettingsProvider>
    <NativeTabs
      key={colorScheme}
      minimizeBehavior='onScrollDown'
      labelStyle={{
        default: { color: tabDefault },
        selected: { color: tabSelected },
      }}
      iconColor={{
        default: tabDefault,
        selected: tabSelected,
      }}
      labelVisibilityMode='labeled'
      disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger name='(home)'>
        {Platform.select({
          ios: <Icon sf='chart.bar.fill' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='bar-chart-2' />} />
          ),
        })}
        <Label>Usage</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='instagram'>
        <Icon src={require('@/assets/images/InstaNavIcon.png')} />
        <Label>Instagram</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='settings'>
        {Platform.select({
          ios: <Icon sf='gear' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='settings' />} />
          ),
        })}
        <Label>Settings</Label>
      </NativeTabs.Trigger>

    </NativeTabs>
    </SettingsProvider>
  );
}
