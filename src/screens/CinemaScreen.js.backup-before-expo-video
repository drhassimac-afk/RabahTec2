import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getSocket, getBaseUrl } from '../socket';
import { AppContext } from '../../App';

export default function CinemaScreen({ route, navigation }) {
  const room = route?.params?.room || { id: 'cinema', name: 'غرفة السينما' };
  const { user } = useContext(AppContext);
  const socket = getSocket();
  const videoRef = useRef(null);
  const [video, setVideo] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState({});
  const [viewers, setViewers] = useState(1);
  const [showPicker, setShowPicker] = useState(false);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    socket?.emit('join_room', { roomId: room.id, user });
    socket?.emit('cinema_get', { roomId: room.id });
    const onVideo = v => setVideo(v);
    const onSync = async ({ action, position }) => {
      if (action === 'play') await videoRef.current?.playFromPositionAsync(position * 1000);
      if (action === 'pause') { await videoRef.current?.pauseAsync(); await videoRef.current?.setPositionAsync(position * 1000); }
      if (action === 'seek') await videoRef.current?.setPositionAsync(position * 1000);
    };
    const onRooms = rs => { const r = rs.find(x => x.id === room.id); if (r) setViewers(r.online); };
    socket?.on('cinema_video', onVideo);
    socket?.on('video_sync', onSync);
    socket?.on('rooms_update', onRooms);
    return () => {
      socket?.emit('leave_room');
      socket?.off('cinema_video', onVideo); socket?.off('video_sync', onSync); socket?.off('rooms_update', onRooms);
    };
  }, []);

  const pos = () => (status.positionMillis || 0) / 1000;
  const emit = (action, position) => socket?.emit('video_action', { roomId: room.id, action, position });
  const toggle = async () => {
    if (playing) { await videoRef.current?.pauseAsync(); emit('pause', pos()); }
    else { await videoRef.current?.playAsync(); emit('play', pos()); }
  };
  const seek = async d => { const p = Math.max(0, pos() + d); await videoRef.current?.setPositionAsync(p * 1000); emit('seek', p); };

  const openPicker = async () => {
    try {
      const files = await (await fetch(`${getBaseUrl()}/files`)).json();
      setVideos(files.filter(f => /\.(mp4|mov|mkv|webm)$/i.test(f.name)));
      setShowPicker(true);
    } catch {}
  };
  const choose = f => { socket?.emit('cinema_set_video', { roomId: room.id, url: f.url, title: f.name }); setShowPicker(false); };
  const fmt = ms => { const s = Math.floor((ms || 0) / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>سينما وتلفاز</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.textDim }}>{viewers}</Text>
          <Ionicons name="people" size={18} color={colors.textDim} />
        </View>
      </View>

      <View style={styles.videoBox}>
        {video ? (
          <Video ref={videoRef} source={{ uri: getBaseUrl() + video.url }} style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={s => { setStatus(s); setPlaying(!!s.isPlaying); }} />
        ) : (
          <TouchableOpacity style={styles.empty} onPress={openPicker}>
            <Ionicons name="film-outline" size={52} color={colors.purple} />
            <Text style={styles.emptyText}>اختر فيديو من ملفات السيرفر{'\n'}وشاهده مع أصدقائك 🍿</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.videoTitle} numberOfLines={1}>{video ? video.title : 'لم يتم اختيار فيديو'}</Text>
      <Text style={styles.time}>{fmt(status.positionMillis)} / {fmt(status.durationMillis)}</Text>

      <View style={styles.controls}>
        <Ctrl icon="play-back" label="10-" onPress={() => seek(-10)} />
        <TouchableOpacity style={styles.playBtn} onPress={toggle} disabled={!video}>
          <Ionicons name={playing ? 'pause' : 'play'} size={30} color="#fff" />
        </TouchableOpacity>
        <Ctrl icon="play-forward" label="10+" onPress={() => seek(10)} />
      </View>

      <TouchableOpacity style={styles.pickBtn} onPress={openPicker}>
        <Ionicons name="folder-open-outline" size={18} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '600' }}>اختيار فيديو آخر</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>فيديوهات السيرفر</Text>
            <FlatList data={videos} keyExtractor={f => f.name}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.fileRow} onPress={() => choose(item)}>
                  <Ionicons name="videocam" size={20} color={colors.purple} />
                  <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>لا توجد فيديوهات — ارفع ملفاً من شاشة الملفات أولاً</Text>} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPicker(false)}>
              <Text style={{ color: '#fff' }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Ctrl = ({ icon, label, onPress }) => (
  <TouchableOpacity style={{ alignItems: 'center', gap: 2 }} onPress={onPress}>
    <Ionicons name={icon} size={22} color={colors.text} />
    <Text style={{ color: colors.textDim, fontSize: 10 }}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  videoBox: { height: 240, margin: 16, backgroundColor: '#000', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  video: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  emptyText: { color: colors.textDim, textAlign: 'center', fontSize: 14, lineHeight: 22 },
  videoTitle: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
  time: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28, marginTop: 14 },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  pickBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.primary },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  fileName: { color: colors.text, flex: 1, textAlign: 'right' },
  closeBtn: { backgroundColor: colors.cardAlt, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
});
