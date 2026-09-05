import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppContext } from '../../App';

const services = [
  { name: 'دردشة', desc: 'محادثات فورية', icon: 'chatbubbles', color: colors.primary, screen: 'Rooms' },
  { name: 'سينما وتلفاز', desc: 'شاهد مع أصدقائك', icon: 'videocam', color: colors.purple, screen: 'Rooms' },
  { name: 'ألعاب', desc: 'العب مع الآخرين', icon: 'game-controller', color: colors.purple, screen: 'Rooms' },
  { name: 'بث مباشر', desc: 'مشاركة البث المباشر', icon: 'radio', color: colors.cyan, screen: 'Rooms' },
];

export default function HomeScreen({ navigation }) {
  const { server } = useContext(AppContext);
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="menu" size={26} color={colors.text} />
        <Text style={styles.logo}>Rabah <Text style={{ color: colors.purple }}>Tec</Text></Text>
        <Ionicons name="notifications-outline" size={24} color={colors.text} />
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 54, marginBottom: 20 },
  logo: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 },
  wifiCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  statusSub: { fontSize: 13, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginTop: 24, marginBottom: 12, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  cardDesc: { color: colors.textDim, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
