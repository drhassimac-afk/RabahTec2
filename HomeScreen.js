import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppContext } from '../../App';
import { useDrawer } from '../components/SideMenu';
import { getBaseUrl, getSocket } from '../socket';

const services = [
  { name: 'دردشة', desc: 'محادثات فورية', icon: 'chatbubbles', color: colors.primary, screen: 'Rooms' },
  { name: 'سينما وتلفاز', desc: 'شاهد مع أصدقائك', icon: 'videocam', color: colors.purple, screen: 'Cinema' },
  { name: 'ألعاب', desc: 'العب مع الآخرين', icon: 'game-controller', color: colors.purple, screen: 'Games' },
  { name: 'بث مباشر', desc: 'مشاركة البث المباشر', icon: 'radio', color: colors.cyan, screen: 'Live' },
  { name: 'ملفات', desc: 'مشاركة الملفات', icon: 'folder', color: '#F59E0B', screen: 'Files' },
  { name: 'الإعدادات', desc: 'تخصيص التطبيق', icon: 'settings', color: colors.textDim, screen: 'الإعدادات' },
];

export default function HomeScreen({ navigation }) {
  const { server } = useContext(AppContext);
  const drawer = useDrawer();
  const [currentRoom, setCurrentRoom] = useState(null);

  useEffect(() => {
    const pick = rs => setCurrentRoom(rs.find(r => r.id === 'general'));
    fetch(`${getBaseUrl()}/rooms`).then(r => r.json()).then(pick).catch(() => {});
    getSocket()?.on('rooms_update', pick);
    return () => getSocket()?.off('rooms_update');
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={drawer.open}>
          <Ionicons name="menu" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.logo}>Rabah <Text style={{ color: colors.purple }}>Tec</Text></Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* حالة الاتصال */}
      <View style={styles.statusCard}>
        <View style={[styles.wifiCircle, { borderColor: server.connected ? colors.primary : colors.textDim }]}>
          <Ionicons name="wifi" size={26} color={server.connected ? colors.primary : colors.textDim} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.statusTitle}>متصل بالسيرفر</Text>
          <Text style={[styles.statusSub, { color: server.connected ? colors.success : '#EF4444' }]}>
            {server.connected ? 'متصل الآن' : 'غير متصل'}
          </Text>
        </View>
        <View style={[styles.dot, { backgroundColor: server.connected ? colors.success : '#EF4444' }]} />
      </View>

      {/* الغرفة الحالية */}
      <Text style={styles.sectionTitle}>الغرفة الحالية</Text>
      <TouchableOpacity style={styles.roomCard} onPress={() => currentRoom && navigation.navigate('Chat', { room: currentRoom })}>
        <Ionicons name="chevron-back" size={20} color={colors.textDim} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.roomName}>{currentRoom?.name || 'الغرفة العامة'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={styles.roomOnline}>{currentRoom?.online ?? 0} عضو متصل</Text>
            <View style={styles.onlineDot} />
          </View>
        </View>
        <View style={styles.roomIcon}>
          <Ionicons name="people" size={24} color={colors.purple} />
        </View>
      </TouchableOpacity>

      {/* الخدمات */}
      <Text style={styles.sectionTitle}>الخدمات</Text>
      <View style={styles.grid}>
        {services.map(s => (
          <TouchableOpacity key={s.name} style={styles.card} onPress={() => navigation.navigate(s.screen)}>
            <View style={[styles.iconBox, { backgroundColor: s.color + '22' }]}>
              <Ionicons name={s.icon} size={28} color={s.color} />
            </View>
            <Text style={styles.cardTitle}>{s.name}</Text>
            <Text style={styles.cardDesc}>{s.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 54, marginBottom: 20 },
  logo: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  notifDot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.purple },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 },
  wifiCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  statusSub: { fontSize: 13, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginTop: 22, marginBottom: 12, textAlign: 'right' },
  roomCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 },
  roomIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.12)', justifyContent: 'center', alignItems: 'center' },
  roomName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  roomOnline: { color: colors.textDim, fontSize: 12 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  cardDesc: { color: colors.textDim, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
