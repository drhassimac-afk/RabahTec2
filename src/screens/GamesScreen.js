import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const GAMES = [
  { name: 'لعبة الذكاء XO', desc: 'تحدَّ صديقاً مباشرة', icon: 'grid', color: colors.primary, ready: true },
  { name: 'تحدي الأسئلة', desc: 'قريباً...', icon: 'help-circle', color: colors.purple, ready: false },
  { name: 'لعبة الكلمات', desc: 'قريباً...', icon: 'text', color: colors.cyan, ready: false },
  { name: 'سباق السيارات', desc: 'قريباً...', icon: 'car-sport', color: '#F59E0B', ready: false },
];

export default function GamesScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الألعاب</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
      </View>
      <View style={styles.banner}>
        <Ionicons name="game-controller" size={50} color={colors.purple} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.bannerTitle}>اختر لعبتك المفضلة</Text>
          <Text style={styles.bannerSub}>وتحدَّ أصدقائك الآن</Text>
        </View>
      </View>
      {GAMES.map(g => (
        <TouchableOpacity key={g.name} style={styles.gameCard}
          onPress={() => g.ready ? navigation.navigate('GameXO') : Alert.alert('قريباً 🔜', 'هذه اللعبة قيد التطوير')}>
          <View style={[styles.iconBox, { backgroundColor: g.color + '22' }]}>
            <Ionicons name={g.icon} size={26} color={g.color} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.gameName}>{g.name}</Text>
            <Text style={styles.gameDesc}>{g.desc}</Text>
          </View>
          <View style={[styles.playBtn, { backgroundColor: g.ready ? colors.primary : colors.cardAlt }]}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{g.ready ? 'العب الآن' : 'قريباً'}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 16 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.purple + '55', gap: 14, marginBottom: 20 },
  bannerTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  bannerSub: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  gameCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border, gap: 12 },
  iconBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  gameName: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  gameDesc: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  playBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
