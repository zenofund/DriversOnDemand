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
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiRequest } from "@/lib/queryClient";
import { useColors } from "@/hooks/useColors";

interface PendingSettlement {
  id: string;
  driver_share: number;
  total_fare: number;
  created_at: string;
  booking_id?: string;
}

interface PendingData {
  transactions: PendingSettlement[];
  total_pending: number;
  transaction_count: number;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paystack_reference?: string;
}

export default function DriverEarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const {
    data: pendingData,
    isLoading: loadingPending,
    refetch: refetchPending,
    isRefetching: isRefetchingPending,
  } = useQuery<PendingData>({
    queryKey: ["/api/payouts/pending"],
    queryFn: () => apiFetch<PendingData>("/payouts/pending"),
  });

  const {
    data: payouts = [],
    isLoading: loadingHistory,
    refetch: refetchHistory,
    isRefetching: isRefetchingHistory,
  } = useQuery<Payout[]>({
    queryKey: ["/api/payouts/history"],
    queryFn: () => apiFetch<Payout[]>("/payouts/history"),
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/payouts/request", {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payouts/pending"] });
      qc.invalidateQueries({ queryKey: ["/api/payouts/history"] });
    },
  });

  const isLoading = loadingPending || loadingHistory;
  const isRefetching = isRefetchingPending || isRefetchingHistory;

  const refetch = () => {
    refetchPending();
    refetchHistory();
  };

  const pending = pendingData?.transactions ?? [];
  const totalPending = pendingData?.total_pending ?? 0;

  const totalPaid = payouts
    .filter((p) => p.status === "completed" || p.status === "success")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const s = makeStyles(colors, insets.top + 20);

  type ListItem =
    | { _type: "payout"; data: Payout }
    | { _type: "pending"; data: PendingSettlement };

  const allItems: ListItem[] = [
    ...payouts.map((p) => ({ _type: "payout" as const, data: p })),
    ...pending.map((p) => ({ _type: "pending" as const, data: p })),
  ].sort(
    (a, b) =>
      new Date(b.data.created_at).getTime() -
      new Date(a.data.created_at).getTime()
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: ListItem;
    index: number;
  }) => {
    const isLast = index === allItems.length - 1;
    if (item._type === "payout") {
      const p = item.data;
      const isCompleted = p.status === "completed" || p.status === "success";
      const statusColor = isCompleted
        ? colors.success
        : p.status === "pending"
        ? colors.warning
        : colors.mutedForeground;
      return (
        <View style={[s.txnRow, !isLast && s.txnBorder]}>
          <View style={s.txnIconBox}>
            <Feather name="credit-card" size={14} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.txnRoute}>Payout #{p.id.slice(-6)}</Text>
            <View style={s.txnMeta}>
              <Text style={[s.txnStatus, { color: statusColor }]}>
                {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
              </Text>
              <Text style={s.txnDate}>
                ·{" "}
                {new Date(p.created_at).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </View>
          </View>
          <Text style={s.txnAmount}>₦{(p.amount ?? 0).toLocaleString()}</Text>
        </View>
      );
    } else {
      const t = item.data;
      return (
        <View style={[s.txnRow, !isLast && s.txnBorder]}>
          <View style={s.txnIconBox}>
            <Feather name="navigation" size={14} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.txnRoute}>
              Trip #{(t.booking_id ?? t.id)?.slice(-6)}
            </Text>
            <View style={s.txnMeta}>
              <Text style={[s.txnStatus, { color: colors.warning }]}>
                Pending payout
              </Text>
              <Text style={s.txnDate}>
                ·{" "}
                {new Date(t.created_at).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </View>
          </View>
          <Text style={s.txnAmount}>
            +₦{(t.driver_share ?? 0).toLocaleString()}
          </Text>
        </View>
      );
    }
  };

  return (
    <FlatList
      style={s.container}
      data={allItems}
      keyExtractor={(item, i) => `${item._type}-${item.data.id}-${i}`}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <>
          <StatusBar barStyle="light-content" />
          <View style={s.hero}>
            <Text style={s.heroLabel}>Total Paid Out</Text>
            <Text style={s.heroAmount}>
              {isLoading ? "–" : `₦${totalPaid.toLocaleString()}`}
            </Text>
            <Text style={s.heroSub}>
              {payouts.length} payout{payouts.length !== 1 ? "s" : ""} received
            </Text>

            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatLabel}>Pending</Text>
                <Text style={[s.heroStatValue, { color: colors.warning }]}>
                  ₦{totalPending.toLocaleString()}
                </Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatLabel}>Trips</Text>
                <Text style={s.heroStatValue}>
                  {pendingData?.transaction_count ?? 0}
                </Text>
              </View>
            </View>

            {totalPending > 0 && (
              <TouchableOpacity
                style={[
                  s.payoutBtn,
                  requestPayoutMutation.isPending && s.payoutBtnDisabled,
                ]}
                onPress={() => requestPayoutMutation.mutate()}
                disabled={requestPayoutMutation.isPending}
                activeOpacity={0.85}
              >
                {requestPayoutMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather name="download" size={14} color="#FFFFFF" />
                    <Text style={s.payoutBtnText}>
                      Request Payout · ₦{totalPending.toLocaleString()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {allItems.length > 0 && (
            <Text style={s.txnHeader}>Transaction History</Text>
          )}
        </>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={s.empty}>
            <Feather name="dollar-sign" size={40} color={colors.border} />
            <Text style={s.emptyTitle}>No earnings yet</Text>
            <Text style={s.emptySub}>
              Complete trips to see your earnings here.
            </Text>
          </View>
        ) : (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )
      }
      contentContainerStyle={{
        paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
        flexGrow: allItems.length === 0 ? 1 : undefined,
      }}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

    hero: {
      backgroundColor: colors.dark,
      paddingHorizontal: 24,
      paddingTop: topPad,
      paddingBottom: 28,
    },
    heroLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.5)",
      marginBottom: 6,
    },
    heroAmount: { fontSize: 44, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    heroSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.45)",
      marginTop: 6,
      marginBottom: 20,
    },
    heroStats: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    heroStat: { flex: 1, alignItems: "center" },
    heroStatLabel: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.45)",
      marginBottom: 5,
    },
    heroStatValue: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
    },
    heroStatDivider: {
      width: 1,
      backgroundColor: "rgba(255,255,255,0.12)",
      marginHorizontal: 4,
    },

    payoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 10,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    payoutBtnDisabled: { opacity: 0.5 },
    payoutBtnText: {
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },

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
    txnRoute: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    txnMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
    },
    txnStatus: { fontSize: 12, fontFamily: "Inter_500Medium" },
    txnDate: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    txnAmount: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.success,
    },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
}
