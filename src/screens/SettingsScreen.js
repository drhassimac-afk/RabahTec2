import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, DevSettings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { colors, accents } from '../theme';
import { AppContext } from '../../App';

const ACCENT_NAMES = { blue: 'أزرق', violet: 'بنفسجي', green: 'أخضر', orange: 'برتقالي', pink: 'وردي' };

export default function SettingsScreen({ navigation }) {
  const { server, user } = useContext(AppContext);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifLive, setNotifLive] = useState(true);
  const [mode, setMode] = useState('dark');
  const [accent, setAccent] = useState('blue');

  useEffect(() => {
    AsyncStorage.getItem('notifMessages').then(v => v !== null && setNotifMessages(v === '1'));
    AsyncStorage.getItem('notifLive').then(v => v !== null && setNotifLive(v === '1'));
    AsyncStorage.getItem('themeMode').then(v => v && setMode(v));
    AsyncStorage.getItem('themeAccent').then(v => v && setAccent(v));
  }, []);

  const toggle = async (key, val, setter) => { setter(val); await AsyncStorage.setItem(key, val ? '1' : '0'); };

  const reloadApp = async () => {
    try { await Updates.reloadAsync(); }
    catch { try { DevSettings.reload(); } catch {} }
  };

  const changeTheme = async (newMode, newAccent) => {
    setMode(newMode); setAccent(newAccent);
    await AsyncStorage.setItem('themeMode', newMode);
    await AsyncStorage.setItem('themeAccent', newAccent);
    await reloadApp(); // يُطبَّق الثيم عند الإقلاع قبل تحميل الشاشات
  };

  const logout = () => Alert.alert('تسجيل الخروج', 'سيتم مسح اسمك وإعادة تشغيل التطبيق', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'خروج', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('username'); reloadApp(); } },
  ]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>الإعدادات</Text>

      <View style={styles.serverCard}>
        <Ionicons name="server" size={22} color={server.connected ? colors.success : '#EF4444'} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.serverTitle}>{server.connected ? 'متصل بالسيرفر ✅' : 'غير متصل ❌'}</Text>
          <Text style={styles.serverUrl} numberOfLines={1}>{server.url || '...'}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: server.connected ? colors.success : '#EF4444' }]} />
      </View>

      <Text style={styles.section}>الحساب</Text>
      <Row icon="person" color={colors.primary} label={`الاسم: ${user.name}`} />

      {/* ===== المظهر ===== */}
      <Text style={styles.section}>المظهر</Text>
      <View style={styles.row}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[{ k: 'light', l: 'فاتح', icon: 'sunny' }, { k: 'dark', l: 'داكن', icon: 'moon' }].map(m => (
            <TouchableOpacity key={m.k}
              style={[styles.modeBtn, mode === m.k && { backgroundColor: colors.primary }]}
              onPress={() => changeTheme(m.k, accent)}>
              <Ionicons name={m.icon} size={14} color={mode === m.k ? '#fff' : colors.textDim} />
              <Text style={{ color: mode === m.k ? '#fff' : colors.textDim, fontSize: 12, fontWeight: 'bold' }}>{m.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.rowLabel}>نمط العرض</Text>
        <Ionicons name="contrast" size={20} color={colors.purple} />
      </View>

      <View style={styles.row}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {Object.keys(accents).map(k => (
            <TouchableOpacity key={k} onPress={() => changeTheme(mode, k)}
              style={[styles.accentDot, { backgroundColor: accents[k].primary }, accent === k && styles.accentActive]}>
              {accent === k && <Ionicons name="checkmark" size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.rowLabel}>لون التطبيق ({ACCENT_NAMES[accent]})</Text>
        <Ionicons name="color-palette" size={20} color={colors.cyan} />
      </View>

      <Row icon="language" color={colors.cyan} label="اللغة" value="العربية" />

      <Text style={styles.section}>الإشعارات</Text>
      <View style={styles.row}>
        <Switch value={notifMessages} onValueChange={v => toggle('notifMessages', v, setNotifMessages)} trackColor={{ true: colors.primary }} thumbColor="#fff" />
        <Text style={styles.rowLabel}>إشعارات الرسائل</Text>
        <Ionicons name="notifications" size={20} color={colors.purple} />
      </View>
      <View style={styles.row}>
        <Switch value={notifLive} onValueChange={v => toggle('notifLive', v, setNotifLive)} trackColor={{ true: colors.primary }} thumbColor="#fff" />
        <Text style={styles.rowLabel}>إشعارات البث المباشر</Text>
        <Ionicons name="radio" size={20} color="#EF4444" />
      </View>

      <Text style={styles.section}>أخرى</Text>
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Admin')}>
        <Ionicons name="chevron-back" size={18} color={colors.textDim} />
        <Text style={styles.rowLabel}>لوحة تحكم المدير 🛡️</Text>
        <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
      </TouchableOpacity>
      <Row icon="help-circle" color={colors.cyan} label="مساعدة ودعم" />
      <Row icon="information-circle" color={colors.textDim} label="عن التطبيق" value="RabahTec v1.0" />

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 15 }}>تسجيل الخروج</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const Row = ({ icon, color, label, value }) => (
  <View style={styles.row}>
    {value ? <Text style={{ color: colors.textDim, fontSize: 13 }}>{value}</Text> : <Ionicons name="chevron-back" size={18} color={colors.textDim} />}
    <Text style={styles.rowLabel}>{label}</Text>
    <Ionicons name={icon} size={20} color={color} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 54, marginBottom: 16 },
  serverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  serverTitle: { color: colors.text, fontSize: 14, fontWeight: 'bold' },
  serverUrl: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginTop: 22, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 14, padding: 15, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  rowLabel: { color: colors.text, fontSize: 14, flex: 1, textAlign: 'right', marginRight: 10 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.cardAlt },
  accentDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  accentActive: { borderWidth: 2, borderColor: '#fff' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, padding: 15, marginTop: 24, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
});
