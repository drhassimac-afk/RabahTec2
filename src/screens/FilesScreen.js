import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getBaseUrl } from '../socket';
import { bump } from '../stats';

const TABS = [{ k: 'all', l: 'الكل' }, { k: 'video', l: 'فيديو' }, { k: 'image', l: 'صور' }, { k: 'doc', l: 'مستندات' }, { k: 'audio', l: 'صوت' }];
const kind = n => /\.(mp4|mov|mkv|webm)$/i.test(n) ? 'video' : /\.(jpg|jpeg|png|gif|webp)$/i.test(n) ? 'image' : /\.(mp3|wav|m4a|ogg)$/i.test(n) ? 'audio' : 'doc';
const ICONS = { video: 'videocam', image: 'image', audio: 'musical-notes', doc: 'document-text' };
const COLORS = { video: colors.purple, image: colors.cyan, audio: '#F59E0B', doc: colors.primary };

export default function FilesScreen({ navigation }) {
  const [files, setFiles] = useState([]);
  const [tab, setTab] = useState('all');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try { setFiles(await (await fetch(`${getBaseUrl()}/files`)).json()); } catch {}
  };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    const f = res.assets[0];
    const form = new FormData();
    form.append('file', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' });
    setUploading(true);
    try {
      await fetch(`${getBaseUrl()}/upload`, { method: 'POST', body: form });
      await bump('files');
      await load();
      Alert.alert('تم ✅', 'تم رفع الملف إلى السيرفر');
    } catch { Alert.alert('خطأ', 'فشل رفع الملف'); }
    setUploading(false);
  };

  const data = files.filter(f => tab === 'all' || kind(f.name) === tab);
  const fmtSize = s => s > 1048576 ? (s / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.ceil(s / 1024)) + ' KB';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الملفات</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.k} style={[styles.tab, tab === t.k && styles.tabActive]} onPress={() => setTab(t.k)}>
            <Text style={[styles.tabText, tab === t.k && { color: '#fff' }]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={f => f.name}
        contentContainerStyle={{ padding: 16 }}
        refreshing={false}
        onRefresh={load}
        renderItem={({ item }) => {
          const k = kind(item.name);
          return (
            <TouchableOpacity style={styles.fileCard} onPress={() => Linking.openURL(getBaseUrl() + item.url)}>
              <View style={[styles.iconBox, { backgroundColor: COLORS[k] + '22' }]}>
                <Ionicons name={ICONS[k]} size={24} color={COLORS[k]} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.fileMeta}>{fmtSize(item.size)} • {new Date(item.date).toLocaleDateString('ar')}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={colors.textDim} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد ملفات — ارفع أول ملف ⬇️</Text>}
      />

      <TouchableOpacity style={styles.uploadBtn} onPress={upload} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : (
          <><Ionicons name="cloud-upload" size={22} color="#fff" /><Text style={styles.uploadText}>رفع ملف إلى السيرفر</Text></>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.card },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  fileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  fileName: { color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: 200 },
  fileMeta: { color: colors.textDim, fontSize: 11, marginTop: 3 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 60 },
  uploadBtn: { flexDirection: 'row', backgroundColor: colors.primary, margin: 16, borderRadius: 16, padding: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

