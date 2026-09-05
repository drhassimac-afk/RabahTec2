import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getBaseUrl, getSocket } from '../socket';

const CATS = ['الكل', 'عامة', 'ترفيه', 'ألعاب', 'تعليم'];
const TYPE_ICONS = { chat: 'chatbubbles', cinema: 'videocam', games: 'game-controller' };
const TYPE_COLORS = { chat: colors.primary, cinema: colors.purple, games: '#F59E0B' };

export default function RoomsScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [cat, setCat] = useState('الكل');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`${getBaseUrl()}/rooms`).then(r => r.json()).then(setRooms).catch(() => {});
    getSocket()?.on('rooms_update', setRooms);
    return () => getSocket()?.off('rooms_update');
  }, []);

  const open = (room) => {
    if (room.type === 'cinema') navigation.navigate('Cinema', { room });
    else if (room.type === 'games') navigation.navigate('GameXO');
    else navigation.navigate('Chat', { room });
  };

  const data = rooms.filter(r =>
    (cat === 'الكل' || r.cat === cat) &&
    (query.trim() === '' || r.name.includes(query.trim()))
  );

  return (
    <View style={styles.container}>
      {/* البحث */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن غرفة..."
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            textAlign="right"
          />
          <Ionicons name="search" size={18} color={colors.textDim} />
        </View>
      </View>

      {/* التبويبات */}
      <View style={styles.tabs}>
        {CATS.map(c => (
          <TouchableOpacity key={c} style={[styles.tab, cat === c && styles.tabActive]} onPress={() => setCat(c)}>
            <Text style={[styles.tabText, cat === c && { color: '#fff' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.room} onPress={() => open(item)}>
            <Ionicons name="chevron-back" size={20} color={colors.textDim} />
            {item.online > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{item.online}</Text></View>
            )}
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.roomName}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.online}>{item.online} عضو متصل</Text>
                <View style={styles.dot} />
              </View>
            </View>
            <View style={[styles.iconBox, { backgroundColor: TYPE_COLORS[item.type] + '22' }]}>
              <Ionicons name={TYPE_ICONS[item.type]} size={22} color={TYPE_COLORS[item.type]} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد غرف مطابقة 🔍</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 11, fontSize: 14 },
  tabs: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.card },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  room: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roomName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  online: { color: colors.textDim, fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 60 },
});
