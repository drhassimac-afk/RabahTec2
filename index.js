import { registerRootComponent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme } from './src/theme';

async function bootstrap() {
  try {
    const mode = await AsyncStorage.getItem('themeMode');
    const accent = await AsyncStorage.getItem('themeAccent');
    applyTheme(mode || 'dark', accent || 'blue');
  } catch {}

  const App = require('./App').default;
  registerRootComponent(App);
}

bootstrap();
