import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getSocket } from '../socket';
import { AppContext } from '../../App';

const ROOM = 'games1';

export default function GameXOScreen({ navigation }) {
  const { user } = useContext(AppContext);
  const socket = getSocket();
  const [g, setG] = useState(null);

  useEffect(() => {
    socket?.emit('xo_join', { roomId: ROOM, user });
    socket?.on('xo_state', setG);
    return () => { socket?.emit('xo_leave', { roomId: ROOM, user }); socket?.off('xo_state'); };
  }, []);

  const me = g?.players.find(p => p.id === user.id);
  const opponent = g?.players.find(p => p.id !== user.id);
  const myTurn = g && me && !g.winner && g.players.length === 2 && g.turn === me.symbol;

  let status = 'بانتظار لاعب آخر... ⏳';
  if (g?.players.length === 2) {
    if (g.winner === 'draw') status = 'تعادل! 🤝';
    else if (g.winner) status = g.winner === me?.symbol ? 'فزت! 🎉' : `فاز ${opponent?.name} 😅`;
    else status = myTurn ? 'دورك أنت ⚡' : `دور ${opponent?.name}...`;
  }

  const press = i => { if (myTurn && !g.board[i]) socket.emit('xo_move', { roomId: ROOM, user, index: i }); };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>لعبة الذكاء XO</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
      </View>

      <View style={styles.playersRow}>
        <PlayerCard name={me ? `${me.name} (${me.symbol})` : 'متفرج'} active={myTurn} color={colors.primary} />
        <Text style={{ color: colors.textDim, fontSize: 18 }}>VS</Text>
        <PlayerCard name={opponent ? `${opponent.name} (${opponent.symbol})` : '؟'} active={!!(g && !g.winner && !myTurn && opponent)} color={colors.purple} />
      </View>

      <Text style={styles.status}>{status}</Text>

      <View style={styles.board}>
        {(g?.board || Array(9).fill(null)).map((cell, i) => (
          <TouchableOpacity key={i} style={[styles.cell, myTurn && !cell && styles.cellActive]} onPress={() => press(i)}>
            <Text style={[styles.cellText, { color: cell === 'X' ? colors.primary : colors.purple }]}>{cell}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {g?.winner && (
        <TouchableOpacity style={styles.resetBtn} onPress={() => socket?.emit('xo_reset', { roomId: ROOM })}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>جولة جديدة</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const PlayerCard = ({ name, active, color }) => (
  <View style={[styles.playerCard, active && { borderColor: color }]}>
    <Ionicons name="person" size={20} color={color} />
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{name}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  playersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, gap: 10 },
  playerCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 2, borderColor: colors.border },
  status: { color: colors.cyan, fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginVertical: 24 },
  board: { flexDirection: 'row', flexWrap: 'wrap', width: 300, alignSelf: 'center', gap: 8 },
  cell: { width: 96, height: 96, backgroundColor: colors.card, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cellActive: { borderColor: colors.primary + '66' },
  cellText: { fontSize: 40, fontWeight: 'bold' },
  resetBtn: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, alignSelf: 'center', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 30 },
});
