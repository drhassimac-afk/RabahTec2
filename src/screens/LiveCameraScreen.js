import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { LiveKitRoom, useTracks, isTrackReference, VideoTrack, registerGlobals } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getBaseUrl } from '../socket';
import { AppContext } from '../../App';

registerGlobals();
const { width } = Dimensions.get('window');

function Stage() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  return (
    <FlatList
      data={tracks}
      keyExtractor={(t, i) => String(i)}
      numColumns={tracks.length > 1 ? 2 : 1}
      renderItem={({ item }) =>
        isTrackReference(item) ? (
          <VideoTrack
            trackRef={item}
            style={{
              width: tracks.length > 1 ? width / 2 - 6 : width - 8,
              height: tracks.length > 1 ? 220 : 420,
              margin: 4,
              borderRadius: 14,
            }}
          />
        ) : null
      }
    />
  );
}

export default function LiveCameraScreen({ navigation }) {
  const { user } = useContext(AppContext);
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.name) return;

    fetch(
      `${getBaseUrl()}/livekit-token?identity=${encodeURIComponent(user.name)}&room=rabah-live`
    )
      .then(r => r.json())
      .then(d => (d.token ? setCfg(d) : setError(d.error || 'غير مفعّل')))
      .catch(() => setError('تعذر الاتصال بالسيرفر'));
  }, [user?.name]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.liveBadge}>
          <View style={styles.redDot} />
          <Text style={styles.liveText}>LIVE كاميرا</Text>
        </View>
      </View>

      {error && (
        <View style={styles.center}>
          <Ionicons name="videocam-off" size={56} color={colors.textDim} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.hint}>
            أضف مفاتيح LiveKit في server/.env ثم أعد تشغيل السيرفر
          </Text>
        </View>
      )}

      {!cfg && !error && (
        <View style={styles.center}>
          <Text style={{ color: colors.textDim }}>جارٍ الاتصال...</Text>
        </View>
      )}

      {cfg && (
        <LiveKitRoom
          serverUrl={cfg.url}
          token={cfg.token}
          connect
          audio
          video
          style={{ flex: 1 }}
        >
          <Stage />
        </LiveKitRoom>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 30,
  },
  errorText: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
  },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
});
