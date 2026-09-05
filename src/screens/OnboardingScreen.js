import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  { key: '1', icon: null,           title: 'Rabah Tec',              sub: 'تواصل، شارك، استمتع' },
  { key: '2', icon: 'chatbubbles',  title: 'دردشة فورية',            sub: 'تحدث مع أصدقائك لحظياً في غرف عامة وخاصة' },
  { key: '3', icon: 'videocam',     title: 'سينما وبث وألعاب',       sub: 'شاهد الفيديو معاً، ابث مباشرة، والعب مع الآخرين' },
];

export default function OnboardingScreen({ onDone }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef();

  const finish = async (target) => {
    await AsyncStorage.setItem('onboarding_done', '1');
    onDone(target); // 'home' أو 'rooms'
  };

  return (
    <View style={styles.container}>
      {/* موجة زخرفية */}
      <LinearGradient colors={['rgba(59,130,246,0.35)', 'transparent']} style={styles.wave1} />
      <LinearGradient colors={['rgba(139,92,246,0.3)', 'transparent']} style={styles.wave2} />

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={s => s.key}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {item.icon ? (
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={70} color={colors.primary} />
              </View>
            ) : (
              <Image source={require('../../assets/icon.png')} style={styles.logoImg} />
            )}
            <Text style={styles.title}>
              {item.key === '1' ? <>Rabah <Text style={{ color: colors.purple }}>Tec</Text></> : item.title}
            </Text>
            <Text style={styles.sub}>{item.sub}</Text>
          </View>
        )}
      />

      {/* النقاط */}
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={() => finish('home')}>
        <LinearGradient colors={[colors.primary, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startBtn}>
          <Text style={styles.startText}>ابدأ الآن</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => finish('rooms')} style={{ marginTop: 18 }}>
        <Text style={styles.enterRoom}>الدخول إلى غرفة</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', paddingBottom: 60 },
  wave1: { position: 'absolute', bottom: -60, left: -80, width: 340, height: 340, borderRadius: 170 },
  wave2: { position: 'absolute', bottom: -30, right: -100, width: 300, height: 300, borderRadius: 150 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  logoImg: { width: 130, height: 130, borderRadius: 32, marginBottom: 30 },
  iconCircle: { width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 2, borderColor: 'rgba(59,130,246,0.35)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  title: { color: colors.text, fontSize: 34, fontWeight: 'bold' },
  sub: { color: colors.textDim, fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  startBtn: { width: width - 64, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  startText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  enterRoom: { color: colors.textDim, fontSize: 14 },
});
