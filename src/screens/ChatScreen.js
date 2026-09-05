import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getSocket } from '../socket';
import { AppContext } from '../../App';

export default function ChatScreen({ route, navigation }) {
  const { room } = route.params;
  const { user } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef();
  const socket = getSocket();

  useEffect(() => {
    socket?.emit('join_room', { roomId: room.id, user });
    socket?.on('room_history', h => setMessages(h));
    socket?.on('new_message', m => setMessages(p => [...p, m]));
    socket?.on('system_message', s => setMessages(p => [...p, { id: Date.now() + Math.random(), system: true, text: s.text }]));
    return () => {
      socket?.emit('leave_room');
      socket?.off('room_history'); socket?.off('new_message'); socket?.off('system_message');
    };
  }, []);

  const send = () => {
    if (!text.trim() || !socket) return;
    socket.emit('send_message', { roomId: room.id, message: { user: user.name, userId: user.id, text: text.trim() } });
    setText('');
  };

  const renderItem = ({ item }) => {
    if (item.system) return <Text style={styles.system}>{item.text}</Text>;
    const mine = item.userId === user.id;
    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
        {!mine && <Text style={styles.sender}>{item.user}</Text>}
        <Text style={styles.msgText}>{item.text}</Text>
        <Text style={styles.time}>{new Date(item.time).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>دردشة</Text>
          <Text style={styles.subtitle}>{room.name}</Text>
        </View>
        <Ionicons name="people" size={22} color={colors.textDim} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

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
        <Ionicons name="attach" size={22} color={colors.textDim} />
      </View>
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
});
