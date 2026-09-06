import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { getSocket, getBaseUrl } from '../socket';
import { AppContext } from '../../App';
import { bump } from '../stats';
import VoiceMessage from '../components/VoiceMessage';

export default function ChatScreen({ route, navigation }) {
  const { room, password } = route.params;
  const { user } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [rec, setRec] = useState(null);
  const [recSec, setRecSec] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const listRef = useRef();
  const recTimer = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    AsyncStorage.getItem('adminKey').then(k => setIsAdmin(!!k));
    bump('rooms');
    socket?.emit('join_room', { roomId: room.id, user, password });
    socket?.on('room_history', h => setMessages(h));
    socket?.on('new_message', m => setMessages(p => [...p, m]));
    socket?.on('system_message', s => setMessages(p => [...p, { id: Date.now() + Math.random(), system: true, text: s.text }]));
    socket?.on('message_deleted', ({ id }) => setMessages(p => p.filter(m => m.id !== id)));
    socket?.on('room_locked', ({ wrong }) => {
      Alert.alert('غرفة خاصة 🔒', wrong ? 'كلمة المرور غير صحيحة' : 'هذه الغرفة محمية بكلمة مرور');
      navigation.goBack();
    });
    return () => {
      socket?.emit('leave_room');
      ['room_history', 'new_message', 'system_message', 'message_deleted', 'room_locked'].forEach(e => socket?.off(e));
    };
  }, []);

  const send = () => {
    if (!text.trim() || !socket) return;
    socket.emit('send_message', { roomId: room.id, message: { user: user.name, userId: user.id, text: text.trim() } });
    bump('messages');
    setText('');
  };

  const attach = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    const f = res.assets[0];
    const form = new FormData();
    form.append('file', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' });
    try {
      const up = await (await fetch(`${getBaseUrl()}/upload`, { method: 'POST', body: form })).json();
      socket?.emit('send_message', { roomId: room.id, message: { user: user.name, userId: user.id, text: `📎 ${f.name}`, file: getBaseUrl() + up.url } });
      bump('messages');
    } catch { Alert.alert('خطأ', 'فشل رفع الملف'); }
  };

  // ===== التسجيل الصوتي =====
  const startRec = async () => {
    try {
      const p = await Audio.requestPermissionsAsync();
      if (!p.granted) return Alert.alert('إذن مرفوض', 'اسمح بالوصول للمايكروفون من الإعدادات');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRec(recording);
      setRecSec(0);
      recTimer.current = setInterval(() => setRecSec(s => s + 1), 1000);
    } catch {}
  };

  const cancelRec = async () => {
    clearInterval(recTimer.current);
    try { await rec?.stopAndUnloadAsync(); } catch {}
    setRec(null);
  };

  const sendRec = async () => {
    clearInterval(recTimer.current);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      const dur = recSec;
      setRec(null);
      const form = new FormData();
      form.append('file', { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/m4a' });
      const up = await (await fetch(`${getBaseUrl()}/upload`, { method: 'POST', body: form })).json();
      socket?.emit('send_message', { roomId: room.id, message: { user: user.name, userId: user.id, text: '', audio: getBaseUrl() + up.url, duration: dur } });
      bump('messages');
    } catch { Alert.alert('خطأ', 'فشل إرسال الرسالة الصوتية'); }
  };

  const onLongPress = (item) => {
    if (!isAdmin || item.system) return;
    Alert.alert('حذف الرسالة 🛡️', `"${item.text || 'رسالة صوتية'}"`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const key = await AsyncStorage.getItem('adminKey');
        await fetch(`${getBaseUrl()}/admin/delete-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
          body: JSON.stringify({ id: item.id }),
        }).catch(() => {});
      } },
    ]);
  };

  const renderItem = ({ item }) => {
    if (item.system) return <Text style={styles.system}>{item.text}</Text>;
    const mine = item.userId === user.id;
    return (
      <TouchableOpacity activeOpacity={0.9} onLongPress={() => onLongPress(item)}
        style={[styles.bubble, mine ? styles.mine : styles.other]}>
        {!mine && <Text style={styles.sender}>{item.user}</Text>}
        {item.audio ? (
          <VoiceMessage uri={item.audio} duration={item.duration} mine={mine} />
        ) : item.file ? (
          <TouchableOpacity onPress={() => Linking.openURL(item.file)}>
            <Text style={[styles.msgText, { textDecorationLine: 'underline' }]}>{item.text}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.msgText}>{item.text}</Text>
        )}
        <Text style={styles.time}>{new Date(item.time).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>دردشة</Text>
          <Text style={styles.subtitle}>{room.name}{room.locked ? ' 🔒' : ''}</Text>
        </View>
        <Ionicons name="people" size={22} color={colors.textDim} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => String(m.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {rec ? (
        <View style={styles.inputRow}>
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.success }]} onPress={sendRec}>
            <Ionicons name="checkmark" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.recBar}>
            <View style={styles.redDot} />
            <Text style={styles.recText}>جارٍ التسجيل... {Math.floor(recSec / 60)}:{String(recSec % 60).padStart(2, '0')}</Text>
          </View>
          <TouchableOpacity onPress={cancelRec}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Ionicons name="send" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.textDim}
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            textAlign="right"
          />
          <TouchableOpacity onPress={startRec}>
            <Ionicons name="mic" size={22} color={colors.textDim} />
          </TouchableOpacity>
          <TouchableOpacity onPress={attach}>
            <Ionicons name="attach" size={22} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  subtitle: { color: colors.textDim, fontSize: 12 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 10, marginBottom: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomLeftRadius: 4 },
  other: { alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderBottomRightRadius: 4 },
  sender: { color: colors.purple, fontSize: 12, fontWeight: 'bold', marginBottom: 3, textAlign: 'right' },
  msgText: { color: colors.text, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  time: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, alignSelf: 'flex-start' },
  system: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginVertical: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  input: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 15 },
  sendBtn: { backgroundColor: colors.primary, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  recBar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 22, paddingVertical: 11 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
});
