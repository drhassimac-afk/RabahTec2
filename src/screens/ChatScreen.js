import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Linking, Alert, Modal } from 'react-native';
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
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
    socket?.on('room_members', setMembersList);
    socket?.on('room_locked', ({ wrong }) => {
      Alert.alert('غرفة خاصة 🔒', wrong ? 'كلمة المرور غير صحيحة' : 'هذه الغرفة محمية بكلمة مرور');
      navigation.goBack();
    });
    return () => {
      socket?.emit('leave_room');
      ['room_history', 'new_message', 'system_message', 'message_deleted', 'room_members', 'room_locked'].forEach(e => socket?.off(e));
    };
  }, []);

  const buildMsg = (extra) => ({
    user: user.name, userId: user.id,
    replyTo: replyingTo ? { id: replyingTo.id, user: replyingTo.user, text: replyingTo.text } : null,
    ...extra,
  });

  const send = () => {
    if (!text.trim() || !socket) return;
    socket.emit('send_message', { roomId: room.id, message: buildMsg({ text: text.trim() }) });
    bump('messages');
    setText('');
    setReplyingTo(null);
  };

  const attach = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    const f = res.assets[0];
    const form = new FormData();
    form.append('file', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' });
    try {
      const up = await (await fetch(`${getBaseUrl()}/upload`, { method: 'POST', body: form })).json();
      socket?.emit('send_message', { roomId: room.id, message: buildMsg({ text: `📎 ${f.name}`, file: getBaseUrl() + up.url }) });
      bump('messages');
      setReplyingTo(null);
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
  const cancelRec = async () => { clearInterval(recTimer.current); try { await rec?.stopAndUnloadAsync(); } catch {} setRec(null); };
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
      socket?.emit('send_message', { roomId: room.id, message: buildMsg({ text: '', audio: getBaseUrl() + up.url, duration: dur }) });
      bump('messages');
      setReplyingTo(null);
    } catch { Alert.alert('خطأ', 'فشل إرسال الرسالة الصوتية'); }
  };

  // ===== الضغط المطوّل: رد + حذف =====
  const onLongPress = (item) => {
    if (item.system) return;
    const buttons = [{ text: 'رد ↩️', onPress: () => setReplyingTo(item) }];
    if (isAdmin) buttons.push({
      text: 'حذف 🗑️', style: 'destructive', onPress: async () => {
        const key = await AsyncStorage.getItem('adminKey');
        await fetch(`${getBaseUrl()}/admin/delete-message`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
          body: JSON.stringify({ id: item.id }),
        }).catch(() => {});
      },
    });
    buttons.push({ text: 'إلغاء', style: 'cancel' });
    Alert.alert(item.user, item.text || '🎙️ رسالة صوتية', buttons);
  };

  // ===== البحث =====
  const doSearch = async (q) => {
    setSearchQ(q);
    if (!q.trim()) return setSearchResults(null);
    try {
      const r = await fetch(`${getBaseUrl()}/messages/search?roomId=${room.id}&q=${encodeURIComponent(q)}`);
      setSearchResults(await r.json());
    } catch {}
  };
  const closeSearch = () => { setSearchMode(false); setSearchQ(''); setSearchResults(null); };

  const renderItem = ({ item }) => {
    if (item.system) return <Text style={styles.system}>{item.text}</Text>;
    const mine = item.userId === user.id;
    return (
      <TouchableOpacity activeOpacity={0.9} onLongPress={() => onLongPress(item)}
        style={[styles.bubble, mine ? styles.mine : styles.other]}>
        {!mine && <Text style={styles.sender}>{item.user}</Text>}

        {/* الرد المقتبس */}
        {item.replyTo && (
          <View style={[styles.quote, { borderColor: mine ? 'rgba(255,255,255,0.5)' : colors.purple }]}>
            <Text style={[styles.quoteUser, { color: mine ? '#fff' : colors.purple }]}>{item.replyTo.user}</Text>
            <Text style={styles.quoteText} numberOfLines={1}>{item.replyTo.text || '🎙️ رسالة صوتية'}</Text>
          </View>
        )}

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
      {/* الترويسة */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>دردشة</Text>
          <Text style={styles.subtitle}>{room.name}{room.locked ? ' 🔒' : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={() => (searchMode ? closeSearch() : setSearchMode(true))}>
            <Ionicons name={searchMode ? 'close' : 'search'} size={21} color={colors.textDim} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMembers(true)}>
            <Ionicons name="people" size={22} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      </View>

      {/* شريط البحث */}
      {searchMode && (
        <View style={styles.searchBar}>
          {searchResults !== null && (
            <TouchableOpacity onPress={() => setSearchResults(null)}>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TextInput style={styles.searchInput} placeholder="ابحث في الرسائل..." placeholderTextColor={colors.textDim}
            value={searchQ} onChangeText={doSearch} textAlign="right" autoFocus />
          <Ionicons name="search" size={18} color={colors.textDim} />
        </View>
      )}

      {/* الرسائل أو نتائج البحث */}
      <FlatList
        ref={listRef}
        data={searchResults !== null ? searchResults : messages}
        keyExtractor={m => String(m.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14 }}
        onContentSizeChange={() => searchResults === null && listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          searchResults !== null
            ? <Text style={styles.system}>لا نتائج لـ "{searchQ}" 🔍</Text>
            : null
        }
      />

      {/* شريط الرد */}
      {replyingTo && (
        <View style={styles.replyBar}>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close-circle" size={22} color={colors.textDim} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.replyToUser}>رد على {replyingTo.user}</Text>
            <Text style={styles.replyToText} numberOfLines={1}>{replyingTo.text || '🎙️ رسالة صوتية'}</Text>
          </View>
          <View style={styles.replyLine} />
        </View>
      )}

      {/* الإدخال */}
      {rec ? (
        <View style={styles.inputRow}>
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.success }]} onPress={sendRec}>
            <Ionicons name="checkmark" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.recBar}>
            <View style={styles.redDot} />
            <Text style={styles.recText}>جارٍ التسجيل... {Math.floor(recSec / 60)}:{String(recSec % 60).padStart(2, '0')}</Text>
          </View>
          <TouchableOpacity onPress={cancelRec}><Ionicons name="trash-outline" size={22} color="#EF4444" /></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Ionicons name="send" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
          </TouchableOpacity>
          <TextInput style={styles.input} placeholder="اكتب رسالة..." placeholderTextColor={colors.textDim}
            value={text} onChangeText={setText} onSubmitEditing={send} textAlign="right" />
          <TouchableOpacity onPress={startRec}><Ionicons name="mic" size={22} color={colors.textDim} /></TouchableOpacity>
          <TouchableOpacity onPress={attach}><Ionicons name="attach" size={22} color={colors.textDim} /></TouchableOpacity>
        </View>
      )}

      {/* نافذة الأعضاء المتصلين */}
      <Modal visible={showMembers} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>المتصلون الآن ({membersList.length}) 👥</Text>
            <FlatList
              data={membersList}
              keyExtractor={(m, i) => m + i}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.memberName}>{item}{item === user.name ? ' (أنت)' : ''}</Text>
                  <View style={styles.memberAvatar}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{item.charAt(0)}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.system}>لا يوجد أعضاء</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMembers(false)}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 17, fontWeight: 'bold' },
  subtitle: { color: colors.textDim, fontSize: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: colors.text, fontSize: 14 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 10, marginBottom: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomLeftRadius: 4 },
  other: { alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderBottomRightRadius: 4 },
  sender: { color: colors.purple, fontSize: 12, fontWeight: 'bold', marginBottom: 3, textAlign: 'right' },
  msgText: { color: colors.text, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  time: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, alignSelf: 'flex-start' },
  system: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginVertical: 6 },
  quote: { borderRightWidth: 3, paddingRight: 8, marginBottom: 6, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 6 },
  quoteUser: { fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
  quoteText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  replyToUser: { color: colors.purple, fontSize: 12, fontWeight: 'bold' },
  replyToText: { color: colors.textDim, fontSize: 12 },
  replyLine: { width: 3, alignSelf: 'stretch', backgroundColor: colors.purple, borderRadius: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  input: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 15 },
  sendBtn: { backgroundColor: colors.primary, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  recBar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 22, paddingVertical: 11 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberName: { color: colors.text, fontSize: 15, flex: 1, textAlign: 'right' },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardAlt, justifyContent: 'center', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  closeBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 14 },
});
