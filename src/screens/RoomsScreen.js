import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getBaseUrl, getSocket } from '../socket';

const CATS = ['الكل', 'عامة', 'ترفيه', 'ألعاب', 'تعليم'];
const CREATE_CATS = ['عامة', 'ترفيه', 'ألعاب', 'تعليم'];
const TYPE_ICONS = { chat: 'chatbubbles', cinema: 'videocam', games: 'game-controller' };
const TYPE_COLORS = { chat: colors.primary, cinema: colors.purple, games: '#F59E0B' };

export default function RoomsScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [cat, setCat] = useState('الكل');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('عامة');
  const [newPass, setNewPass] = useState('');
  const [lockRoom, setLockRoom] = useState(null);
  const [lockPass, setLockPass] = useState('');

  useEffect(() => {
    fetch(`${getBaseUrl()}/rooms`).then(r => r.json()).then(setRooms).catch(() => {});
    getSocket()?.on('rooms_update', setRooms);
    return () => getSocket()?.off('rooms_update');
  }, []);

  const navigateTo = (room, password) => {
    if (room.type === 'cinema') navigation.navigate('Cinema', { room });
    else if (room.type === 'games') navigation.navigate('GameXO');
    else navigation.navigate('Chat', { room, password });
  };

  const open = (room) => {
    if (room.locked) { setLockRoom(room); setLockPass(''); return; }
    navigateTo(room);
  };

  const create = async () => {
    if (!newName.trim()) return;
    try {
      await fetch(`${getBaseUrl()}/rooms/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), cat: newCat, password: newPass.trim() || null, createdBy: 'app' }),
      });
      setShowCreate(false);
      setNewName(''); setNewPass(''); setNewCat('عامة');
    } catch { Alert.alert('خطأ', 'تعذر إنشاء الغرفة'); }
  };

  const data = rooms.filter(r =>
    (cat === 'الكل' || r.cat === cat) &&
    (query.trim() === '' || r.name.includes(query.trim()))
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <TextInput style={styles.searchInput} placeholder="ابحث عن غرفة..." placeholderTextColor={colors.textDim}
            value={query} onChangeText={setQuery} textAlign="right" />
          <Ionicons name="search" size={18} color={colors.textDim} />
        </View>
      </View>

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
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.room} onPress={() => open(item)}>
            <Ionicons name="chevron-back" size={20} color={colors.textDim} />
            {item.online > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{item.online}</Text></View>
            )}
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.locked && <Ionicons name="lock-closed" size={13} color="#F59E0B" />}
                <Text style={styles.roomName}>{item.name}</Text>
              </View>
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

      {/* زر إنشاء غرفة */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* نافذة إنشاء غرفة */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>إنشاء غرفة جديدة</Text>
            <TextInput style={styles.field} placeholder="اسم الغرفة" placeholderTextColor={colors.textDim}
              value={newName} onChangeText={setNewName} textAlign="right" />
            <View style={styles.catRow}>
              {CREATE_CATS.map(c => (
                <TouchableOpacity key={c} style={[styles.tab, newCat === c && styles.tabActive]} onPress={() => setNewCat(c)}>
                  <Text style={[styles.tabText, newCat === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.field} placeholder="كلمة مرور (اختياري — اتركها فارغة لغرفة عامة)" placeholderTextColor={colors.textDim}
              value={newPass} onChangeText={setNewPass} textAlign="right" secureTextEntry />
            <TouchableOpacity style={styles.createBtn} onPress={create}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>إنشاء الغرفة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={{ color: colors.textDim }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* نافذة كلمة المرور */}
      <Modal visible={!!lockRoom} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { marginBottom: '50%' }]}>
            <Ionicons name="lock-closed" size={36} color="#F59E0B" style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.modalTitle}>غرفة خاصة 🔒</Text>
            <Text style={{ color: colors.textDim, textAlign: 'center', marginBottom: 12 }}>{lockRoom?.name}</Text>
            <TextInput style={styles.field} placeholder="كلمة المرور" placeholderTextColor={colors.textDim}
              value={lockPass} onChangeText={setLockPass} textAlign="center" secureTextEntry autoFocus />
            <TouchableOpacity style={styles.createBtn} onPress={() => { navigateTo(lockRoom, lockPass); setLockRoom(null); }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>دخول</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLockRoom(null)}>
              <Text style={{ color: colors.textDim }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 11, fontSize: 14 },
  tabs: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, marginBottom: 4, flexWrap: 'wrap' },
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
  fab: { position: 'absolute', bottom: 24, left: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 24, padding: 22, margin: 0 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  field: { backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  catRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  createBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtn: { alignItems: 'center', padding: 12, marginTop: 6 },
});
