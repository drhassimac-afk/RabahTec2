import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, DevSettings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppContext } from '../../App';

export default function SettingsScreen() {
  const { server, user } = useContext(AppContext);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifLive, setNotifLive] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('notifMessages').then(v => v !== null && setNotifMessages(v === '1'));
    AsyncStorage.getItem('notifLive').then(v => v !== null && setNotifLive(v === '1'));
  }, []);

  const toggle = async (key, val, setter) => { setter(val); await AsyncStorage.setItem(key, val ? '1' : '0'); };

  const logout = () => Alert.alert('تسجيل الخروج', 'سيتم مسح اسمك وإعادة تشغيل التطبيق', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'خروج', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('username'); DevSettings.reload(); } },
  ]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>الإعدادات</Text>

      {/* حالة السيرفر — حقيقية */}
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
      <Row icon="moon" color={colors.purple} label="المظهر: داكن" value="داكن" />
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
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, padding: 15, marginTop: 24, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
});
