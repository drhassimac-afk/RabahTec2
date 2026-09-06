import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getBaseUrl } from '../socket';

const TABS = [{ k: 'stats', l: 'إحصائيات', icon: 'stats-chart' }, { k: 'users', l: 'المستخدمون', icon: 'people' }, { k: 'messages', l: 'الرسائل', icon: 'chatbubbles' }];

export default function AdminScreen({ navigation }) {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomFilter, setRoomFilter] = useState('');

  const headers = async () => ({
    'Content-Type': 'application/json',
    'x-admin-key': await AsyncStorage.getItem('adminKey'),
  });

  const login = async (k = key) => {
    try {
      const r = await fetch(`${getBaseUrl()}/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }),
      });
      if (r.ok) { await AsyncStorage.setItem('adminKey', k); setAuthed(true); }
      else Alert.alert('خطأ', 'المفتاح غير صحيح');
    } catch { Alert.alert('خطأ', 'تعذر الاتصال'); }
  };

  useEffect(() => {
    AsyncStorage.getItem('adminKey').then(k => { if (k) { setKey(k); login(k); } });
    fetch(`${getBaseUrl()}/rooms`).then(r => r.json()).then(setRooms).catch(() => {});
  }, []);

  const load = async () => {
    const h = await headers();
    try {
      if (tab === 'stats') setStats(await (await fetch(`${getBaseUrl()}/admin/stats`, { headers: h })).json());
      if (tab === 'users') setUsers(await (await fetch(`${getBaseUrl()}/admin/users`, { headers: h })).json());
      if (tab === 'messages') setMessages(await (await fetch(`${getBaseUrl()}/admin/messages${roomFilter ? `?roomId=${roomFilter}` : ''}`, { headers: h })).json());
    } catch {}
  };
  useEffect(() => { if (authed) load(); }, [tab, authed, roomFilter]);

  const ban = async (username, isBanned) => {
    const h = await headers();
    await fetch(`${getBaseUrl()}/admin/ban`, { method: 'POST', headers: h, body: JSON.stringify({ username, ban: !isBanned }) }).catch(() => {});
    load();
  };

  const delMsg = async (id) => {
    const h = await headers();
    await fetch(`${getBaseUrl()}/admin/delete-message`, { method: 'POST', headers: h, body: JSON.stringify({ id }) }).catch(() => {});
    load();
  };

  // ===== شاشة الدخول =====
  if (!authed) {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="shield-checkmark" size={70} color={colors.primary} style={{ alignSelf: 'center' }} />
        <Text style={styles.loginTitle}>لوحة تحكم المدير</Text>
        <TextInput style={styles.field} placeholder="مفتاح الأدمن" placeholderTextColor={colors.textDim}
          value={key} onChangeText={setKey} secureTextEntry textAlign="center" />
        <TouchableOpacity style={styles.loginBtn} onPress={() => login()}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>دخول</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.textDim, textAlign: 'center' }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>لوحة التحكم 🛡️</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t.k} style={[styles.tabBtn, tab === t.k && styles.tabBtnActive]} onPress={() => setTab(t.k)}>
            <Ionicons name={t.icon} size={16} color={tab === t.k ? '#fff' : colors.textDim} />
            <Text style={[styles.tabBtnText, tab === t.k && { color: '#fff' }]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== الإحصائيات ===== */}
      {tab === 'stats' && stats && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.statsGrid}>
            <StatCard icon="people" label="المستخدمون" value={stats.users} color={colors.primary} />
            <StatCard icon="chatbubbles" label="الرسائل" value={stats.messages} color={colors.purple} />
            <StatCard icon="home" label="الغرف" value={stats.rooms} color={colors.cyan} />
            <StatCard icon="wifi" label="متصل الآن" value={stats.online} color={colors.success} />
            <StatCard icon="ban" label="محظورون" value={stats.banned} color="#EF4444" />
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={load}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>تحديث</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ===== المستخدمون ===== */}
      {tab === 'users' && (
        <FlatList
          data={users}
          keyExtractor={u => u.username}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <TouchableOpacity
                style={[styles.banBtn, { backgroundColor: item.banned ? colors.success + '22' : '#EF444422' }]}
                onPress={() => Alert.alert(item.banned ? 'فك الحظر' : 'حظر المستخدم', item.username, [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: item.banned ? 'فك الحظر' : 'حظر', style: 'destructive', onPress: () => ban(item.username, item.banned) },
                ])}>
                <Ionicons name={item.banned ? 'checkmark-circle' : 'ban'} size={16} color={item.banned ? colors.success : '#EF4444'} />
                <Text style={{ color: item.banned ? colors.success : '#EF4444', fontSize: 12, fontWeight: 'bold' }}>
                  {item.banned ? 'فك الحظر' : 'حظر'}
                </Text>
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.userName}>{item.username}{item.banned ? ' 🚫' : ''}</Text>
                <Text style={styles.userMeta}>{item.friends} صديق • آخر ظهور {item.lastSeen ? new Date(item.lastSeen).toLocaleDateString('ar') : '—'}</Text>
              </View>
              <View style={styles.avatar}><Ionicons name="person" size={16} color={colors.primary} /></View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>لا يوجد مستخدمون (فعّل MongoDB)</Text>}
        />
      )}

      {/* ===== الرسائل ===== */}
      {tab === 'messages' && (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 46 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
            <TouchableOpacity style={[styles.tab, !roomFilter && styles.tabActive]} onPress={() => setRoomFilter('')}>
              <Text style={[styles.tabText, !roomFilter && { color: '#fff' }]}>الكل</Text>
            </TouchableOpacity>
            {rooms.map(r => (
              <TouchableOpacity key={r.id} style={[styles.tab, roomFilter === r.id && styles.tabActive]} onPress={() => setRoomFilter(r.id)}>
                <Text style={[styles.tabText, roomFilter === r.id && { color: '#fff' }]}>{r.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={styles.msgRow}>
                <TouchableOpacity onPress={() => delMsg(item.id)}>
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.msgUser}>{item.user} <Text style={{ color: colors.textDim, fontSize: 10 }}>• {item.roomId}</Text></Text>
                  <Text style={styles.msgText} numberOfLines={2}>{item.text || '🎙️ رسالة صوتية'}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>لا توجد رسائل</Text>}
          />
        </View>
      )}
    </View>
  );
}

const StatCard = ({ icon, label, value, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loginTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  field: { backgroundColor: colors.card, borderRadius: 14, padding: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  loginBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  tabsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.card },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  refreshBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: colors.border },
  banBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  userName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  userMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cardAlt, justifyContent: 'center', alignItems: 'center' },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.card },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  msgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: colors.border },
  msgUser: { color: colors.purple, fontSize: 12, fontWeight: 'bold' },
  msgText: { color: colors.text, fontSize: 13, textAlign: 'right', marginTop: 2 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 50 },
});
