import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppContext } from '../../App';
import { getStats } from '../stats';
import { getBaseUrl } from '../socket';

const AVATAR_COLORS = [colors.primary, colors.purple, colors.cyan, '#F59E0B', '#EF4444', '#10B981'];
const ACHIEVEMENT_NAMES = {
  first_msg: 'أول رسالة 💬', active: 'عضو نشط ⚡', chatty: 'ثرثار 🗣️',
  social: 'اجتماعي 🌟', legend: 'أسطورة 👑',
};

export default function ProfileScreen({ navigation }) {
  const { user, setUser } = useContext(AppContext);
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(colors.primary);
  const [avatar, setAvatar] = useState(null);
  const [stats, setStats] = useState({ messages: 0, rooms: 0, files: 0 });
  const [profile, setProfile] = useState({ points: 0, achievements: [] });
  const [editing, setEditing] = useState(false);

  const loadProfile = async () => {
    try {
      const p = await (await fetch(`${getBaseUrl()}/users/${encodeURIComponent(user.name)}/profile`)).json();
      setProfile(p);
      if (p.avatar) setAvatar(getBaseUrl() + p.avatar);
    } catch {}
  };

  useEffect(() => {
    AsyncStorage.getItem('avatarColor').then(c => c && setColor(c));
    getStats().then(setStats);
    loadProfile();
  }, []);

  const save = async () => {
    const n = name.trim() || user.name;
    await AsyncStorage.setItem('username', n);
    await AsyncStorage.setItem('avatarColor', color);
    setUser({ id: n, name: n });
    setEditing(false);
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('إذن مرفوض', 'اسمح بالوصول للصور');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled) return;
    const f = res.assets[0];
    const form = new FormData();
    form.append('username', user.name);
    form.append('file', { uri: f.uri, name: 'avatar.jpg', type: 'image/jpeg' });
    try {
      const r = await (await fetch(`${getBaseUrl()}/users/avatar`, { method: 'POST', body: form })).json();
      setAvatar(getBaseUrl() + r.url + '?t=' + Date.now());
    } catch { Alert.alert('خطأ', 'فشل رفع الصورة'); }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>الملف الشخصي</Text>

      {/* الصورة */}
      <View style={styles.avatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: color }]} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: color + '33', borderColor: color }]}>
            <Text style={[styles.avatarLetter, { color }]}>{user.name.charAt(0)}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.camBtn} onPress={pickAvatar}>
          <Ionicons name="camera" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* تغيير لون الحرف (يظهر عند عدم وجود صورة) */}
      {!avatar && (
        <View style={styles.colorRow}>
          {AVATAR_COLORS.map(c => (
            <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && { borderWidth: 2, borderColor: '#fff' }]}
              onPress={() => { setColor(c); AsyncStorage.setItem('avatarColor', c); }} />
          ))}
        </View>
      )}

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

      {/* النقاط */}
      <View style={styles.pointsCard}>
        <Ionicons name="star" size={26} color="#F59E0B" />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.pointsValue}>{profile.points} نقطة</Text>
          <Text style={styles.pointsLabel}>نقاطك في RabahTec</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="الرسائل" value={stats.messages} />
        <Stat label="الغرف" value={stats.rooms} />
        <Stat label="الملفات" value={stats.files} />
      </View>

      {/* الإنجازات */}
      <Text style={styles.section}>الإنجازات ({profile.achievements.length}/{Object.keys(ACHIEVEMENT_NAMES).length})</Text>
      <View style={styles.badgesWrap}>
        {Object.entries(ACHIEVEMENT_NAMES).map(([id, label]) => {
          const earned = profile.achievements.includes(id);
          return (
            <View key={id} style={[styles.badge, !earned && { opacity: 0.35 }]}>
              <Text style={{ color: earned ? colors.text : colors.textDim, fontSize: 12, fontWeight: '600' }}>
                {earned ? label : '🔒 ' + label}
              </Text>
            </View>
          );
        })}
      </View>

      {[
        { icon: 'people', label: 'أصدقائي', color: colors.primary, go: 'Friends' },
        { icon: 'trophy', label: 'المتصدرون', color: '#F59E0B', go: 'Leaderboard' },
        { icon: 'notifications', label: 'الإشعارات', color: colors.purple },
      ].map(item => (
        <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => item.go && navigation.navigate(item.go)}>
          <Ionicons name="chevron-back" size={18} color={colors.textDim} />
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </TouchableOpacity>
      ))}
      <View style={{ height: 30 }} />
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
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 40, fontWeight: 'bold' },
  camBtn: { position: 'absolute', bottom: 0, left: 0, backgroundColor: colors.purple, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  name: { color: colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 14 },
  nameInput: { backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 16, minWidth: 160 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  pointsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  pointsValue: { color: '#F59E0B', fontSize: 20, fontWeight: 'bold' },
  pointsLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderRadius: 18, padding: 18, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginTop: 22, marginBottom: 10 },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  badge: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  menuLabel: { color: colors.text, fontSize: 15, flex: 1, textAlign: 'right', marginRight: 10 },
});
