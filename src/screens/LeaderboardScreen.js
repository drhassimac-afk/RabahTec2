import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { getBaseUrl } from '../socket';

const LeaderboardScreen = () => {
  const navigation = useNavigation();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/leaderboard`);

      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [loadLeaderboard])
  );

  const refresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const renderAvatar = (item) => {
    if (item.avatar) {
      return (
        <Image
          source={{ uri: getBaseUrl() + item.avatar }}
          style={styles.avatar}
        />
      );
    }

    return (
      <View style={styles.avatarFallback}>
        <Ionicons name="person" size={22} color={colors.cyan} />
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
    const rank = index + 1;

    return (
      <View style={styles.row}>
        <View style={styles.rankBox}>
          {rank <= 3 ? (
            <Ionicons
              name="trophy"
              size={22}
              color={
                rank === 1
                  ? '#FFD700'
                  : rank === 2
                  ? '#C0C0C0'
                  : '#CD7F32'
              }
            />
          ) : (
            <Text style={styles.rank}>{rank}</Text>
          )}
        </View>

        {renderAvatar(item)}

        <View style={styles.userInfo}>
          <Text style={styles.username} numberOfLines={1}>
            {item.username || 'مستخدم'}
          </Text>

          <Text style={styles.points}>
            {item.points || 0} نقطة
          </Text>
        </View>

        {rank === 1 && (
          <Text style={styles.crown}>👑</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>المتصدرون</Text>
          <Text style={styles.subtitle}>أفضل اللاعبين والأعضاء</Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="trophy"
            size={25}
            color="#F59E0B"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
          <Text style={styles.loadingText}>
            جارٍ تحميل المتصدرين...
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item, index) =>
            `${item.username || 'user'}-${index}`
          }
          renderItem={renderItem}
          contentContainerStyle={
            users.length === 0
              ? styles.emptyContainer
              : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            users.length > 0 ? (
              <View style={styles.banner}>
                <Ionicons
                  name="trophy"
                  size={32}
                  color="#F59E0B"
                />
                <View style={styles.bannerText}>
                  <Text style={styles.bannerTitle}>
                    لوحة المتصدرين 🏆
                  </Text>
                  <Text style={styles.bannerSubtitle}>
                    اجمع النقاط وتصدر القائمة
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="trophy-outline"
                size={65}
                color={colors.textDim}
              />
              <Text style={styles.emptyTitle}>
                لا يوجد متصدرون بعد
              </Text>
              <Text style={styles.emptyText}>
                ابدأ بالتفاعل وإرسال الرسائل لجمع النقاط
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  header: {
    height: 82,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 3,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B18',
  },

  list: {
    padding: 16,
    paddingBottom: 30,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },

  bannerText: {
    marginLeft: 14,
  },

  bannerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  bannerSubtitle: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 4,
  },

  row: {
    minHeight: 72,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rankBox: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rank: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '800',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginHorizontal: 10,
  },

  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },

  userInfo: {
    flex: 1,
  },

  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  points: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },

  crown: {
    fontSize: 23,
    marginRight: 10,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.textDim,
    marginTop: 12,
    fontSize: 14,
  },

  emptyContainer: {
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 15,
  },

  emptyText: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default LeaderboardScreen;
