import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getSocket, getBaseUrl } from '../socket';
import { AppContext } from '../../App';

export default function CinemaScreen({ route, navigation }) {
  const room = route?.params?.room || { id: 'cinema', name: 'غرفة السينما' };
  const { user } = useContext(AppContext);
  const socket = getSocket();

  const [video, setVideo] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [viewers, setViewers] = useState(1);
  const [showPicker, setShowPicker] = useState(false);
  const [videos, setVideos] = useState([]);

  const player = useVideoPlayer(null, player => {
    player.loop = false;
  });

  useEffect(() => {
    socket?.emit('join_room', { roomId: room.id, user });
    socket?.emit('cinema_get', { roomId: room.id });

    const onVideo = v => setVideo(v);

    const onSync = ({ action, position: syncPosition }) => {
      const p = Number(syncPosition) || 0;

      if (action === 'play') {
        player.currentTime = p;
        player.play();
      }

      if (action === 'pause') {
        player.currentTime = p;
        player.pause();
      }

      if (action === 'seek') {
        player.currentTime = p;
      }
    };

    const onRooms = rs => {
      const r = rs.find(x => x.id === room.id);
      if (r) setViewers(r.online);
    };

    socket?.on('cinema_video', onVideo);
    socket?.on('video_sync', onSync);
    socket?.on('rooms_update', onRooms);

    return () => {
      socket?.emit('leave_room');
      socket?.off('cinema_video', onVideo);
      socket?.off('video_sync', onSync);
      socket?.off('rooms_update', onRooms);
    };
  }, []);

  useEffect(() => {
    let timer;

    if (video) {
      const uri = getBaseUrl() + video.url;

      player.replaceAsync(uri).catch(() => {});

      timer = setInterval(() => {
        setPosition(player.currentTime || 0);
        setDuration(player.duration || 0);
        setPlaying(!!player.playing);
      }, 250);
    } else {
      setPosition(0);
      setDuration(0);
      setPlaying(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [video]);

  const pos = () => player.currentTime || 0;

  const emit = (action, p) =>
    socket?.emit('video_action', {
      roomId: room.id,
      action,
      position: p
    });

  const toggle = () => {
    if (!video) return;

    const p = pos();

    if (playing) {
      player.pause();
      emit('pause', p);
    } else {
      player.play();
      emit('play', p);
    }
  };

  const seek = d => {
    if (!video) return;

    player.seekBy(d);
    const p = Math.max(0, pos() + d);
    emit('seek', p);
  };

  const openPicker = async () => {
    try {
      const files = await (await fetch(`${getBaseUrl()}/files`)).json();

      setVideos(
        files.filter(f =>
          /\.(mp4|mov|mkv|webm)$/i.test(f.name)
        )
      );

      setShowPicker(true);
    } catch {}
  };

  const choose = f => {
    socket?.emit('cinema_set_video', {
      roomId: room.id,
      url: f.url,
      title: f.name
    });

    setShowPicker(false);
  };

  const fmt = seconds => {
    const s = Math.floor(seconds || 0);

    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
      s % 60
    ).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-forward"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.title}>سينما وتلفاز</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.textDim }}>{viewers}</Text>
          <Ionicons
            name="people"
            size={18}
            color={colors.textDim}
          />
        </View>
      </View>

      <View style={styles.videoBox}>
        {video ? (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <TouchableOpacity
            style={styles.empty}
            onPress={openPicker}
          >
            <Ionicons
              name="film-outline"
              size={52}
              color={colors.purple}
            />

            <Text style={styles.emptyText}>
              اختر فيديو من ملفات السيرفر{'\n'}
              وشاهده مع أصدقائك 🍿
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text
        style={styles.videoTitle}
        numberOfLines={1}
      >
        {video ? video.title : 'لم يتم اختيار فيديو'}
      </Text>

      <Text style={styles.time}>
        {fmt(position)} / {fmt(duration)}
      </Text>

      <View style={styles.controls}>
        <Ctrl
          icon="play-back"
          label="10-"
          onPress={() => seek(-10)}
        />

        <TouchableOpacity
          style={styles.playBtn}
          onPress={toggle}
          disabled={!video}
        >
          <Ionicons
            name={playing ? 'pause' : 'play'}
            size={30}
            color="#fff"
          />
        </TouchableOpacity>

        <Ctrl
          icon="play-forward"
          label="10+"
          onPress={() => seek(10)}
        />
      </View>

      <TouchableOpacity
        style={styles.pickBtn}
        onPress={openPicker}
      >
        <Ionicons
          name="folder-open-outline"
          size={18}
          color={colors.primary}
        />

        <Text
          style={{
            color: colors.primary,
            fontWeight: '600'
          }}
        >
          اختيار فيديو آخر
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
      >
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              فيديوهات السيرفر
            </Text>

            <FlatList
              data={videos}
              keyExtractor={f => f.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.fileRow}
                  onPress={() => choose(item)}
                >
                  <Ionicons
                    name="videocam"
                    size={20}
                    color={colors.purple}
                  />

                  <Text
                    style={styles.fileName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    color: colors.textDim,
                    textAlign: 'center',
                    padding: 20
                  }}
                >
                  لا توجد فيديوهات — ارفع ملفاً من شاشة الملفات أولاً
                </Text>
              }
            />

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowPicker(false)}
            >
              <Text style={{ color: '#fff' }}>
                إغلاق
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Ctrl = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={{ alignItems: 'center', gap: 2 }}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={22}
      color={colors.text}
    />

    <Text
      style={{
        color: colors.textDim,
        fontSize: 10
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12
  },

  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold'
  },

  videoBox: {
    height: 240,
    margin: 16,
    backgroundColor: '#000',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center'
  },

  video: {
    flex: 1
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 20
  },

  emptyText: {
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22
  },

  videoTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20
  },

  time: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4
  },

  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginTop: 14
  },

  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },

  pickBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary
  },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },

  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%'
  },

  modalTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right'
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },

  fileName: {
    color: colors.text,
    flex: 1,
    textAlign: 'right'
  },

  closeBtn: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 12
  }
});
