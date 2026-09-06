import AsyncStorage from '@react-native-async-storage/async-storage';

export async function bump(key) {
  const v = parseInt((await AsyncStorage.getItem('stat_' + key)) || '0') + 1;
  await AsyncStorage.setItem('stat_' + key, String(v));
}

export async function getStats() {
  const out = {};
  for (const k of ['messages', 'rooms', 'files'])
    out[k] = parseInt((await AsyncStorage.getItem('stat_' + k)) || '0');
  return out;
}
