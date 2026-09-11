import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Linking, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { getSocket, getBaseUrl } from '../socket';
import { AppContext } from '../../App';
import { bump } from '../stats';
import VoiceMessage from '../components/VoiceMessage';

const EMOJIS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

export default function ChatScreen({ route, navigation }) {
  const { room, password } = route.params;
  const { user } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [rec, setRec] = useState(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recSec, setRecSec] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [readUpTo, setReadUpTo] = useState(0);
  const [actionMsg, setActionMsg] = useState(null);
  const [onlineList, setOnlineList] = useState([]);
  const [peerStatus, setPeerStatus] = useState(null);

  const listRef = useRef();
  const recTimer = useRef(null);
  const typingTimers = useRef({});
  const lastTypingSent = useRef(0);
  const socket = getSocket();

  const isDM = room.id.startsWith('dm-');
  const peer = isDM ? room.id.slice(3).split('--').find(n => n !== user.name) : null;

  useEffect(() => {
    AsyncStorage.getItem('adminKey').then(k => setIsAdmin(!!k));
    bump('rooms');
    socket?.emit('join_room', { roomId: room.id, user, password });
    socket?.emit('get_presence');
    socket?.emit('mark_read', { roomId: room.id });

    socket?.on('room_history', h => setMessages(h));
    socket?.on('new_message', m => {
      setMessages(p => [...p, m]);
      socket?.emit('mark_read', { roomId: room.id });
    });
    socket?.on('system_message', s => setMessages(p => [...p, { id: Date.now() + Math.random(), system: true, text: s.text }]));
    socket?.on('message_deleted', ({ id }) => setMessages(p => p.filter(m => String(m.id) !== String(id))));
    socket?.on('message_reactions', ({ messageId, reactions }) =>
      setMessages(p => p.map(m => (String(m.id) === String(messageId) ? { ...m, reactions } : m))));
    socket?.on('room_members', setMembersList);
    socket?.on('presence', setOnlineList);
    socket?.on('messages_read', ({ by, at }) => {
      if (by !== user.name) setReadUpTo(prev => Math.max(prev, at));
    });
    socket?.on('user_typing', ({ user: name }) => {
      if (!name || name === user.name) return;
      setTypingUsers(p => ({ ...p, [name]: Date.now() }));
      clearTimeout(typingTimers.current[name]);
      typingTimers.current[name] = setTimeout(() => {
        setTypingUsers(p => { const c = { ...p }; delete c[name]; return c; });
      }, 3000);
    });
    socket?.on('room_locked', ({ wrong }) => {
      Alert.alert('غرفة خاصة 🔒', wrong ? 'كلمة المرور غير صحيحة' : 'هذه الغرفة محمية بكلمة مرور');
      navigation.goBack();
    });

    if (peer) {
      fetch(`${getBaseUrl()}/users/${encodeURIComponent(peer)}/status`)
        .then(r => r.json()).then(setPeerStatus).catch(() => {});
    }

    return () => {
      socket?.emit('leave_room');
      ['room_history','new_message','system_message','message_deleted','message_reactions',
       'room_members','presence','messages_read','user_typing','room_locked'].forEach(e => socket?.off(e));
    };
  }, []);

  const peerOnline = peer && onlineList.includes(peer);
  const subtitle = isDM
    ? (peerOnline ? 'متصل الآن 🟢' : peerStatus?.lastSeen
        ? 'آخر ظهور ' + new Date(peerStatus.lastSeen).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
        : 'غير متصل')
    : room.name + (room.locked ? ' 🔒' : '');

  const buildMsg = (extra) => ({
    user: user.name, userId: user.id,
    replyTo: replyingTo ? { id: replyingTo.id, user: replyingTo.user, text: replyingTo.text } : null,
    ...extra,
  });

  const onChangeText = (t) => {
    setText(t);
    const now = Date.now();
    if (t.trim() && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      socket?.emit('typing', { roomId: room.id });
    }
  };

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

  const startRec = async () => {
    try {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      if (!p.granted) return Alert.alert('إذن مرفوض', 'اسمح بالوصول للمايكروفون من الإعدادات');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRec(audioRecorder);
      setRecSec(0);
      recTimer.current = setInterval(() => setRecSec(s => s + 1), 1000);
    } catch {}
  };
  const cancelRec = async () => { clearInterval(recTimer.current); try { await audioRecorder.stop(); } catch {} setRec(null); };
  const sendRec = async () => {
    clearInterval(recTimer.current);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
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

  const react = (emoji) => {
    socket?.emit('react_message', { roomId: room.id, messageId: actionMsg.id, emoji });
    setActionMsg(null);
  };

  const deleteActionMsg = async () => {
    const key = await AsyncStorage.getItem('adminKey');
    await fetch(`${getBaseUrl()}/admin/delete-message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ id: actionMsg.id }),
    }).catch(() => {});
    setActionMsg(null);
  };

  const doSearch = async (q) => {
    setSearchQ(q);
    if (!q.trim()) return setSearchResults(null);
    try {
      const r = await fetch(`${getBaseUrl()}/messages/search?roomId=${room.id}&q=${encodeURIComponent(q)}`);
      setSearchResults(await r.json());
    } catch {}
  };
  const closeSearch = () => { setSearchMode(false); setSearchQ(''); setSearchResults(null); };

  const typingNames = Object.keys(typingUsers);

  const renderItem = ({ item }) => {
    if (item.system) return <Text style={styles.system}>{item.text}</Text>;
    const mine = item.userId === user.id;
    const isRead = new Date(item.time).getTime() <= readUpTo;
    return (
      <TouchableOpacity activeOpacity={0.9} onLongPress={() => setActionMsg(item)}
        style={[styles.bubble, mine ? styles.mine : styles.other]}>
        {!mine && <Text style={styles.sender}>{item.user}</Text>}

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

        {/* التفاعلات */}
        {!!item.reactions && Object.keys(item.reactions).length > 0 && (
          <View style={styles.reactionsRow}>
            {Object.entries(item.reactions).map(([emoji, users]) => (
              <TouchableOpacity key={emoji} style={styles.reactionChip}
                onPress={() => socket?.emit('react_message', { roomId: room.id, messageId: item.id, emoji })}>
                <Text style={{ fontSize: 12 }}>{emoji}</Text>
                <Text style={styles.reactionCount}>{users.length}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.time}>{new Date(item.time).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
          {mine && (
            <Ionicons name="checkmark-done" size={14} color={isRead ? '#7DD3FC' : 'rgba(255,255,255,0.5)'} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>{isDM ? room.name : 'دردشة'}</Text>
          <Text style={[styles.subtitle, peerOnline && { color: colors.success }]}>{subtitle}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={() => (searchMode ? closeSearch() : setSearchMode(true))}>
            <Ionicons name={searchMode ? 'close' : 'search'} size={21} color={colors.textDim} />
          </TouchableOpacity>
          {!isDM && (
            <TouchableOpacity onPress={() => setShowMembers(true)}>
              <Ionicons name="people" size={22} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* شريط "يكتب الآن" */}
      {typingNames.length > 0 && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>{typingNames.join('، ')} يكتب الآن</Text>
          <Text style={styles.typingDots}>💬 ...</Text>
        </View>
      )}

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

      <FlatList
        ref={listRef}
        data={searchResults !== null ? searchResults : messages}
        keyExtractor={m => String(m.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14 }}
        onContentSizeChange={() => searchResults === null && listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={searchResults !== null ? <Text style={styles.system}>لا نتائج لـ "{searchQ}" 🔍</Text> : null}
      />

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
            value={text} onChangeText={onChangeText} onSubmitEditing={send} textAlign="right" />
          <TouchableOpacity onPress={startRec}><Ionicons name="mic" size={22} color={colors.textDim} /></TouchableOpacity>
          <TouchableOpacity onPress={attach}><Ionicons name="attach" size={22} color={colors.textDim} /></TouchableOpacity>
        </View>
      )}

      {/* نافذة إجراءات الرسالة (تفاعل/رد/حذف) */}
      <Modal visible={!!actionMsg} transparent animationType="fade">
        <TouchableOpacity style={styles.actionBg} activeOpacity={1} onPress={() => setActionMsg(null)}>
          <View style={styles.actionCard}>
            <View style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} onPress={() => react(e)}>
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setReplyingTo(actionMsg); setActionMsg(null); }}>
              <Text style={styles.actionText}>رد ↩️</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity style={styles.actionBtn} onPress={deleteActionMsg}>
                <Text style={[styles.actionText, { color: '#EF4444' }]}>حذف 🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* نافذة الأعضاء */}
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
  typingBar: { flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(59,130,246,0.08)', paddingVertical: 5 },
  typingText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  typingDots: { fontSize: 11 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: colors.text, fontSize: 14 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 10, marginBottom: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomLeftRadius: 4 },
  other: { alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderBottomRightRadius: 4 },
  sender: { color: colors.purple, fontSize: 12, fontWeight: 'bold', marginBottom: 3, textAlign: 'right' },
  msgText: { color: colors.text, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
  time: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  system: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginVertical: 6 },
  quote: { borderRightWidth: 3, paddingRight: 8, marginBottom: 6, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 6 },
  quoteUser: { fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
  quoteText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  reactionChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  reactionCount: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
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
  actionBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  actionCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, width: 280, borderWidth: 1, borderColor: colors.border },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  actionDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  actionBtn: { paddingVertical: 10, alignItems: 'center' },
  actionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberName: { color: colors.text, fontSize: 15, flex: 1, textAlign: 'right' },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardAlt, justifyContent: 'center', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  closeBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 14 },
});
