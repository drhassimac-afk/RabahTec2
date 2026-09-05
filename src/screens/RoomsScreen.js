import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getBaseUrl, getSocket } from '../socket';

export default function RoomsScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetch(`${getBaseUrl()}/rooms`).then(r => r.json()).then(setRooms).catch(() => {});
    getSocket()?.on('rooms_update', setRooms);
    return () => getSocket()?.off('rooms_update');
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الغرف</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.room} onPress={() => navigation.navigate('Chat', { room: item })}>
            <Ionicons name="chevron-back" size={20} color={colors.textDim} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.roomName}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.online}>{item.online} عضو متصل</Text>
                <View style={styles.dot} />
              </View>
            </View>
            <View style={styles.iconBox}><Ionicons name="people" size={22} color={colors.purple} /></View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  room: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.12)', justifyContent: 'center', alignItems: 'center' },
  roomName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  online: { color: colors.textDim, fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
});
