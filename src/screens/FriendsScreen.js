import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getBaseUrl, getSocket } from '../socket';
import { AppContext } from '../../App';

export const dmId = (a, b) => 'dm-' + [a, b].sort().join('--');

export default function FriendsScreen({ navigation }) {
  const { user } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const base = getBaseUrl();
  const me = encodeURIComponent(user.name);

  const load = useCallback(async () => {
    try {
      setFriends(await (await fetch(`${base}/friends/${me}`)).json());
      setRequests(await (await fetch(`${base}/friends/requests/${me}`)).json());
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const s = getSocket();
    s?.on('friend_request', load);
    s?.on('friend_accepted', load);
    return () => { s?.off('friend_request'); s?.off('friend_accepted'); };
  }, []);

  const search = async (q) => {
    setQuery(q);
    if (!q.trim()) return setResults([]);
    try {
      const all = await (await fetch(`${base}/users/search?q=${encodeURIComponent(q)}`)).json();
      setResults(all.filter(u => u.username !== user.name));
    } catch {}
  };

  const sendRequest = async (to) => {
    try {
      await fetch(`${base}/friends/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: user.name, to }),
      });
      Alert.alert('تم ✅', `أُرسل طلب صداقة إلى ${to}`);
    } catch { Alert.alert('خطأ', 'تعذر إرسال الطلب'); }
  };

  const accept = async (from) => {
    await fetch(`${base}/friends/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: user.name }),
    }).catch(() => {});
    load();
  };

  const openChat = (friendName) =>
    navigation.navigate('Chat', { room: { id: dmId(user.name, friendName), name: friendName } });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الأصدقاء</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* البحث */}
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} placeholder="ابحث عن مستخدم..." placeholderTextColor={colors.textDim}
          value={query} onChangeText={search} textAlign="right" />
        <Ionicons name="search" size={18} color={colors.textDim} />
      </View>

      {results.map(r => (
        <View key={r.username} style={styles.row}>
          <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(r.username)}>
            <Ionicons name="person-add" size={14} color="#fff" />
            <Text style={styles.addText}>إضافة</Text>
          </TouchableOpacity>
          <Text style={styles.rowName}>{r.username}</Text>
          <View style={styles.avatar}><Ionicons name="person" size={16} color={colors.cyan} /></View>
        </View>
      ))}

      {/* الطلبات الواردة */}
      {requests.length > 0 && <Text style={styles.section}>طلبات الصداقة ({requests.length})</Text>}
      {requests.map(r => (
        <View key={r.from} style={[styles.row, { borderColor: colors.purple + '55' }]}>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.purple }]} onPress={() => accept(r.from)}>
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={styles.addText}>قبول</Text>
          </TouchableOpacity>
          <Text style={styles.rowName}>{r.from}</Text>
          <View style={styles.avatar}><Ionicons name="person" size={16} color={colors.purple} /></View>
        </View>
      ))}

      {/* أصدقائي */}
      <Text style={styles.section}>أصدقائي ({friends.length})</Text>
      {friends.map(f => (
        <TouchableOpacity key={f.username} style={styles.row} onPress={() => openChat(f.username)}>
          <View style={[styles.addBtn, { backgroundColor: colors.cardAlt }]}>
            <Ionicons name="chatbubbles" size={14} color={colors.primary} />
            <Text style={[styles.addText, { color: colors.primary }]}>دردشة</Text>
          </View>
          <Text style={styles.rowName}>{f.username}</Text>
          <View style={styles.avatar}><Ionicons name="person" size={16} color={colors.primary} /></View>
        </TouchableOpacity>
      ))}
      {friends.length === 0 && (
        <Text style={styles.empty}>لا أصدقاء بعد — ابحث عن أصدقائك بالاسم وأرسل لهم طلباً 👆</Text>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 16 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 11, fontSize: 14 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'right' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cardAlt, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 30, lineHeight: 22 },
});
