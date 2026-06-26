import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
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
      transactions: Array.isArray(raw.transactions)
        ? raw.transactions
        : Array.isArray(raw)
        ? raw
        : [],
    }),
  });

  const s = makeStyles(colors);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const txns = data?.transactions ?? [];

  const renderTxn = ({ item }: { item: Transaction }) => {
    const statusColor =
      item.status === "paid"
        ? colors.success
        : item.status === "processing"
        ? colors.warning
        : colors.mutedForeground;

    return (
      <View style={s.txnItem}>
        <View style={s.txnIcon}>
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
        <View style={s.header}>
          <View style={s.heroCard}>
            <Text style={s.heroLabel}>Total Earned</Text>
            <Text style={s.heroAmount}>₦{(data?.total_earned ?? 0).toLocaleString()}</Text>
            <Text style={s.heroSub}>{data?.completed_trips ?? 0} trips completed</Text>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>This Week</Text>
              <Text style={s.statAmount}>₦{(data?.this_week ?? 0).toLocaleString()}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>This Month</Text>
              <Text style={s.statAmount}>₦{(data?.this_month ?? 0).toLocaleString()}</Text>
            </View>
          </View>

          {(data?.pending_payout ?? 0) > 0 && (
            <View style={s.payoutBanner}>
              <Feather name="clock" size={16} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={s.payoutTitle}>Pending Payout</Text>
                <Text style={s.payoutAmount}>₦{(data?.pending_payout ?? 0).toLocaleString()}</Text>
              </View>
            </View>
          )}

          {txns.length > 0 && (
            <Text style={s.sectionTitle}>Transaction History</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={s.empty}>
            <Feather name="dollar-sign" size={40} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No earnings yet</Text>
            <Text style={s.emptySub}>Complete trips to see your earnings here.</Text>
          </View>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) }}
      scrollEnabled={!!txns.length}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: { padding: 16, gap: 14 },
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
    },
    heroLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.primaryForeground, opacity: 0.8 },
    heroAmount: { fontSize: 36, fontFamily: "Inter_700Bold", color: colors.primaryForeground, marginTop: 6 },
    heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.primaryForeground, opacity: 0.7, marginTop: 4 },
    statsRow: { flexDirection: "row", gap: 12 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 6 },
    statAmount: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    payoutBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#fef3c7",
      borderRadius: 12,
      padding: 14,
    },
    payoutTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#92400e" },
    payoutAmount: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#92400e" },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 4,
    },
    txnItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txnIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    txnRoute: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    txnMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    txnStatus: { fontSize: 12, fontFamily: "Inter_500Medium" },
    txnDate: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    txnAmount: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.success },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
