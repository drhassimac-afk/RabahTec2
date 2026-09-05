import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getSocket } from '../socket';
import { AppContext } from '../../App';

const LIVE_ID = 'main';

export default function LiveScreen({ navigation }) {
  const { user } = useContext(AppContext);
  const socket = getSocket();
  const [viewers, setViewers] = useState(0);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [hearts, setHearts] = useState([]);
  const listRef = useRef();

  useEffect(() => {
    socket?.emit('join_live', { liveId: LIVE_ID, user });
    const onH = h => setMessages(h);
    const onM = m => setMessages(p => [...p.slice(-80), m]);
    const onR = ({ emoji }) => spawn(emoji);
    socket?.on('live_viewers', setViewers);
    socket?.on('live_history', onH);
    socket?.on('live_message', onM);
    socket?.on('live_reaction', onR);
    return () => {
      socket?.emit('leave_live', { liveId: LIVE_ID });
      socket?.off('live_viewers'); socket?.off('live_history', onH);
      socket?.off('live_message', onM); socket?.off('live_reaction', onR);
    };
  }, []);

  const spawn = emoji => {
    const id = Date.now() + Math.random();
    const anim = new Animated.Value(0);
    setHearts(h => [...h.slice(-15), { id, emoji, anim, x: Math.random() * 50 }]);
    Animated.timing(anim, { toValue: 1, duration: 2600, useNativeDriver: true })
      .start(() => setHearts(h => h.filter(x => x.id !== id)));
  };

  const send = () => {
    if (!text.trim()) return;
    socket?.emit('live_message', { liveId: LIVE_ID, message: { user: user.name, text: text.trim() } });
    setText('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* منطقة الفيديو */}
      <View style={styles.videoArea}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color="#fff" /></TouchableOpacity>
          <View style={styles.liveBadge}><View style={styles.redDot} /><Text style={styles.liveText}>LIVE</Text></View>
          <View style={styles.viewersBox}>
            <Ionicons name="eye" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12 }}>{viewers}</Text>
          </View>
        </View>
        <Ionicons name="radio" size={60} color="rgba(255,255,255,0.25)" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>بث مباشر من المدينة 🌃</Text>

        {/* القلوب الطائرة */}
        {hearts.map(h => (
          <Animated.Text key={h.id} style={{
            position: 'absolute', bottom: 10, right: 20 + h.x, fontSize: 26,
            opacity: h.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [{ translateY: h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -220] }) }],
          }}>{h.emoji}</Animated.Text>
        ))}
      </View>

      {/* الدردشة */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={styles.msgRow}>
            <View style={styles.avatar}><Ionicons name="person" size={14} color={colors.primary} /></View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.msgUser}>{item.user}</Text>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Ionicons name="send" size={18} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>
        <TextInput style={styles.input} placeholder="اكتب تعليق..." placeholderTextColor={colors.textDim}
          value={text} onChangeText={setText} onSubmitEditing={send} textAlign="right" />
        <TouchableOpacity onPress={() => socket?.emit('live_react', { liveId: LIVE_ID, emoji: '❤️' })}>
          <Text style={{ fontSize: 24 }}>❤️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => socket?.emit('live_react', { liveId: LIVE_ID, emoji: '🔥' })}>
          <Text style={{ fontSize: 24 }}>🔥</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  videoArea: { height: 300, backgroundColor: '#0D1220', justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  topRow: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 5 },
  redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  viewersBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  msgRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.cardAlt, justifyContent: 'center', alignItems: 'center' },
  msgUser: { color: colors.purple, fontSize: 11, fontWeight: 'bold' },
  msgText: { color: colors.text, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  input: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: colors.text },
  sendBtn: { backgroundColor: colors.primary, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});
