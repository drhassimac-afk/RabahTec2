import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function VoiceMessage({ uri, duration, mine }) {
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => () => { sound?.unloadAsync().catch(() => {}); }, [sound]);

  const toggle = async () => {
    try {
      if (sound) {
        if (playing) { await sound.pauseAsync(); setPlaying(false); }
        else { await sound.playAsync(); setPlaying(true); }
        return;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(s);
      setPlaying(true);
      s.setOnPlaybackStatusUpdate(st => {
        if (st.isLoaded) {
          setPos(st.positionMillis / 1000);
          if (st.didJustFinish) { setPlaying(false); setPos(0); }
        }
      });
    } catch {}
  };

  const total = duration || 0;
  const progress = total ? Math.min(pos / total, 1) : 0;
  const bars = [10, 17, 23, 14, 20, 12, 18, 24, 15, 21, 13, 17];

  return (
    <TouchableOpacity style={styles.row} onPress={toggle} activeOpacity={0.85}>
      <View style={[styles.btn, { backgroundColor: mine ? 'rgba(255,255,255,0.25)' : 'rgba(139,92,246,0.3)' }]}>
        <Ionicons name={playing ? 'pause' : 'play'} size={16} color="#fff" />
      </View>
      <View style={styles.wave}>
        {bars.map((h, i) => (
          <View key={i} style={[styles.bar, {
            height: h,
            backgroundColor: i / bars.length <= progress ? '#fff' : 'rgba(255,255,255,0.35)',
          }]} />
        ))}
      </View>
      <Text style={styles.dur}>
        {total ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}` : '🎙️'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 170 },
  btn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, flex: 1, height: 26 },
  bar: { width: 3, borderRadius: 2 },
  dur: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
});
