import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppContext } from '../../App';
import { getStats } from '../stats';

const AVATAR_COLORS = [colors.primary, colors.purple, colors.cyan, '#F59E0B', '#EF4444', '#10B981'];

export default function ProfileScreen() {
  const { user, setUser } = useContext(AppContext);
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(colors.primary);
  const [stats, setStats] = useState({ messages: 0, rooms: 0, files: 0 });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('avatarColor').then(c => c && setColor(c));
    getStats().then(setStats);
  }, []);

  const save = async () => {
    const n = name.trim() || user.name;
    await AsyncStorage.setItem('username', n);
    await AsyncStorage.setItem('avatarColor', color);
    setUser({ id: n, name: n });
    setEditing(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>الملف الشخصي</Text>

      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[styles.avatarLetter, { color }]}>{user.name.charAt(0)}</Text>
        </View>
        <TouchableOpacity style={styles.camBtn} onPress={() => {
          const i = AVATAR_COLORS.indexOf(color);
          setColor(AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length]);
        }}>
          <Ionicons name="camera" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={styles.saveBtn} onPress={save}><Text style={{ color: '#fff', fontWeight: 'bold' }}>حفظ</Text></TouchableOpacity>
          <TextInput style={styles.nameInput} value={name} onChangeText={setName} textAlign="right" />
        </View>
      ) : (
        <TouchableOpacity onPress={() => setEditing(true)}>
          <Text style={styles.name}>{user.name} ✏️</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.since}>عضو منذ {new Date().getFullYear()}</Text>

      <View style={styles.statsRow}>
        <Stat label="الرسائل" value={stats.messages} />
        <Stat label="الغرف" value={stats.rooms} />
        <Stat label="الملفات" value={stats.files} />
      </View>

      {[
        { icon: 'people', label: 'أصدقائي', color: colors.primary },
        { icon: 'trophy', label: 'الإنجازات', color: '#F59E0B' },
        { icon: 'notifications', label: 'الإشعارات', color: colors.purple },
      ].map(item => (
        <TouchableOpacity key={item.label} style={styles.menuItem}>
          <Ionicons name="chevron-back" size={18} color={colors.textDim} />
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const Stat = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 54 },
  avatarWrap: { alignSelf: 'center', marginTop: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 40, fontWeight: 'bold' },
  camBtn: { position: 'absolute', bottom: 0, left: 0, backgroundColor: colors.purple, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  name: { color: colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 14 },
  since: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 },
  nameInput: { backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 16, minWidth: 160 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderRadius: 18, padding: 18, marginTop: 24, borderWidth: 1, borderColor: colors.border },
  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  menuLabel: { color: colors.text, fontSize: 15, flex: 1, textAlign: 'right', marginRight: 10 },
});
