import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image, Alert, DevSettings } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { navigationRef } from '../navigationRef';

const { width } = Dimensions.get('window');
const MENU_W = Math.min(300, width * 0.78);

const DrawerContext = createContext(null);
export const useDrawer = () => useContext(DrawerContext);

const ITEMS = [
  { icon: 'home',            label: 'الرئيسية',      go: { type: 'tab',    name: 'الرئيسية' } },
  { icon: 'people',          label: 'الغرف',         go: { type: 'screen', name: 'Rooms' } },
  { icon: 'heart',           label: 'الأصدقاء',      go: { type: 'screen', name: 'Friends' } },
  { icon: 'chatbubbles',     label: 'دردشة',         go: { type: 'screen', name: 'Chat', params: { room: { id: 'general', name: 'الغرفة العامة' } } } },
  { icon: 'videocam',        label: 'سينما وتلفاز',  go: { type: 'screen', name: 'Cinema' } },
  { icon: 'radio',           label: 'بث مباشر',      go: { type: 'screen', name: 'Live' } },
  { icon: 'game-controller', label: 'الألعاب',       go: { type: 'screen', name: 'Games' } },
  { icon: 'folder',          label: 'الملفات',       go: { type: 'screen', name: 'Files' } },
  { icon: 'settings',        label: 'الإعدادات',     go: { type: 'tab',    name: 'الإعدادات' } },
];

export function DrawerProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    setVisible(true);
    Animated.timing(anim, { toValue: 1, duration: 230, useNativeDriver: true }).start();
  }, []);

  const close = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => setVisible(false));
  }, []);

  const go = (item) => {
    close();
    setTimeout(() => {
      if (!navigationRef.isReady()) return;
      if (item.go.type === 'tab') navigationRef.navigate('Tabs', { screen: item.go.name });
      else navigationRef.navigate(item.go.name, item.go.params);
    }, 200);
  };

  const logout = () => {
    close();
    setTimeout(() => Alert.alert('تسجيل الخروج', 'سيتم مسح اسمك وإعادة تشغيل التطبيق', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('username');
        DevSettings.reload();
      } },
    ]), 250);
  };

  return (
    <DrawerContext.Provider value={{ open, close }}>
      <View style={{ flex: 1 }}>
        {children}
        {visible && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[styles.backdrop, {
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] })
            }]}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
            </Animated.View>

            <Animated.View style={[styles.panel, {
              transform: [{
                translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [MENU_W, 0] })
              }],
            }]}>
              <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image source={require('../../assets/icon.png')} style={styles.logo} />
                  <Text style={styles.logoText}>
                    Rabah <Text style={{ color: colors.purple }}>Tec</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={close}>
                  <Ionicons name="close" size={24} color={colors.textDim} />
                </TouchableOpacity>
              </View>

              {ITEMS.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.item, i === 0 && styles.itemActive]}
                  onPress={() => go(item)}
                >
                  <Text style={[styles.itemLabel, i === 0 && { color: colors.purple }]}>
                    {item.label}
                  </Text>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={i === 0 ? colors.purple : colors.textDim}
                  />
                </TouchableOpacity>
              ))}

              <View style={{ flex: 1 }} />
              <View style={styles.divider} />

              <TouchableOpacity style={styles.item} onPress={logout}>
                <Text style={[styles.itemLabel, { color: '#EF4444' }]}>
                  تسجيل الخروج
                </Text>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: MENU_W,
    backgroundColor: colors.card,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: { width: 34, height: 34, borderRadius: 9 },
  logoText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  item: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  itemActive: { backgroundColor: 'rgba(139,92,246,0.12)' },
  itemLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
});
