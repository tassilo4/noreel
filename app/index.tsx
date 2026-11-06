import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      setDone(val === 'true');
      setChecked(true);
    });
  }, []);

  if (!checked) return null;
  return <Redirect href={done ? '/(tabs)' : '/onboarding'} />;
}
