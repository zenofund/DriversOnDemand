import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useColors } from "@/hooks/useColors";

interface EarningsData {
  total_earned: number;
  this_week: number;
  this_month: number;
  completed_trips: number;
  pending_payout: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  booking_id: string;
  amount: number;
  status: "pending" | "paid" | "processing";
  created_at: string;
  pickup_location?: string;
  destination?: string;
}

export default function DriverEarningsScreen() {
  const colors = useColors();

  const { data, isLoading, refetch, isRefetching } = useQuery<EarningsData>({
    queryKey: ["/api/drivers/earnings"],
    queryFn: () => apiFetch<EarningsData>("/drivers/earnings"),
    select: (raw: any) => ({
      total_earned: raw.total_earned ?? raw.totalEarned ?? 0,
      this_week: raw.this_week ?? raw.thisWeek ?? 0,
      this_month: raw.this_month ?? raw.thisMonth ?? 0,
      completed_trips: raw.completed_trips ?? raw.completedTrips ?? 0,
      pending_payout: raw.pending_payout ?? raw.pendingPayout ?? 0,
      transactions: Array.isArray(raw.transactions) ? raw.transactions : Array.isArray(raw) ? raw : [],
    }),
  });

  const s = makeStyles(colors);
  const txns = data?.transactions ?? [];

  const renderTxn = ({ item, index }: { item: Transaction; index: number }) => {
    const statusColor =
      item.status === "paid" ? colors.success
      : item.status === "processing" ? colors.warning
      : colors.mutedForeground;

    return (
      <View style={[s.txnRow, index < txns.length - 1 && s.txnBorder]}>
        <View style={s.txnIconBox}>
          <Feather name="navigation" size={14} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          {item.pickup_location ? (
            <Text style={s.txnRoute} numberOfLines={1}>
              {item.pickup_location} → {item.destination}
            </Text>
          ) : (
            <Text style={s.txnRoute}>Trip #{item.booking_id?.slice(-6)}</Text>
          )}
          <View style={s.txnMeta}>
            <Text style={[s.txnStatus, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
            <Text style={s.txnDate}>
              · {new Date(item.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
            </Text>
          </View>
        </View>
        <Text style={s.txnAmount}>+₦{(item.amount ?? 0).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <FlatList
      style={[s.container, { paddingTop: Platform.OS === "web" ? 67 : 0 }]}
      data={txns}
      keyExtractor={(t) => t.id}
      renderItem={renderTxn}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <>
          <StatusBar barStyle="light-content" />
          {/* Dark earnings hero */}
          <View style={s.hero}>
            <Text style={s.heroLabel}>Total Earned</Text>
            <Text style={s.heroAmount}>
              {isLoading ? "–" : `₦${(data?.total_earned ?? 0).toLocaleString()}`}
            </Text>
            <Text style={s.heroSub}>{data?.completed_trips ?? 0} trips completed</Text>

            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatLabel}>This Week</Text>
                <Text style={s.heroStatValue}>₦{(data?.this_week ?? 0).toLocaleString()}</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatLabel}>This Month</Text>
                <Text style={s.heroStatValue}>₦{(data?.this_month ?? 0).toLocaleString()}</Text>
              </View>
              {(data?.pending_payout ?? 0) > 0 && (
                <>
                  <View style={s.heroStatDivider} />
                  <View style={s.heroStat}>
                    <Text style={s.heroStatLabel}>Pending</Text>
                    <Text style={[s.heroStatValue, { color: colors.warning }]}>
                      ₦{(data?.pending_payout ?? 0).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {txns.length > 0 && (
            <Text style={s.txnHeader}>Transaction History</Text>
          )}
        </>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={s.empty}>
            <Feather name="dollar-sign" size={40} color={colors.border} />
            <Text style={s.emptyTitle}>No earnings yet</Text>
            <Text style={s.emptySub}>Complete trips to see your earnings here.</Text>
          </View>
        ) : null
      }
      contentContainerStyle={{
        paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
        flexGrow: txns.length === 0 ? 1 : undefined,
      }}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    hero: {
      backgroundColor: colors.dark,
      paddingHorizontal: 24,
      paddingTop: Platform.OS === "ios" ? 60 : Platform.OS === "web" ? 76 : 24,
      paddingBottom: 28,
    },
    heroLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)", marginBottom: 6 },
    heroAmount: { fontSize: 44, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginTop: 6, marginBottom: 24 },
    heroStats: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: 14,
    },
    heroStat: { flex: 1, alignItems: "center" },
    heroStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginBottom: 5 },
    heroStatValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 4 },

    txnHeader: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
    },

    txnRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    txnBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    txnIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    txnRoute: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    txnMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    txnStatus: { fontSize: 12, fontFamily: "Inter_500Medium" },
    txnDate: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    txnAmount: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.success },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
      gap: 10,
    },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
