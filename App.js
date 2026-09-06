import React, { useEffect, useState, createContext } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './src/theme';
import { connectSocket } from './src/socket';
import HomeScreen from './src/screens/HomeScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import ChatScreen from './src/screens/ChatScreen';
import CinemaScreen from './src/screens/CinemaScreen';
import FilesScreen from './src/screens/FilesScreen';
import LiveScreen from './src/screens/LiveScreen';
import LiveCameraScreen from './src/screens/LiveCameraScreen';

import GamesScreen from './src/screens/GamesScreen';
import GameXOScreen from './src/screens/GameXOScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminScreen from './src/screens/AdminScreen';
import { Alert } from 'react-native';

export const AppContext = createContext(null);
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, text: colors.text, primary: colors.primary, border: colors.border } };

function Tabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 62, paddingBottom: 8 },
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textDim,
      tabBarIcon: ({ color, size }) => {
        const icons = { 'الرئيسية': 'home', 'الملف الشخصي': 'person-outline', 'الإعدادات': 'settings-outline' };
        return <Ionicons name={icons[route.name]} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="الرئيسية" component={HomeScreen} />
      <Tab.Screen name="الملف الشخصي" component={ProfileScreen} />
      <Tab.Screen name="الإعدادات" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [server, setServer] = useState({ connected: false, url: '' });

  useEffect(() => {
    (async () => {
      let name = await AsyncStorage.getItem('username');
      if (!name) { name = 'مستخدم' + Math.floor(Math.random() * 1000); await AsyncStorage.setItem('username', name); }
      setUser({ id: name, name });
      const { socket, baseUrl } = await connectSocket({ id: name, name });
      setServer({ connected: !!socket, url: baseUrl });
      if (socket) {
  socket.on('banned', () => {
    Alert.alert('تم حظرك 🚫', 'قام المدير بحظر حسابك من التطبيق');
    })();
  }, []);

  if (!user) return null;
  return (
    <AppContext.Provider value={{ user, setUser, server }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Rooms" component={RoomsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Cinema" component={CinemaScreen} />
          <Stack.Screen name="Files" component={FilesScreen} />
          <Stack.Screen name="Live" component={LiveScreen} />
          <Stack.Screen name="LiveCamera" component={LiveCameraScreen} />
          <Stack.Screen name="Games" component={GamesScreen} />
          <Stack.Screen name="GameXO" component={GameXOScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}
