import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiFetch, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

interface BookingRequest {
  id: string;
  status: "pending" | "accepted" | "ongoing" | "completed" | "cancelled" | "rejected";
  pickup_location: string;
  destination: string;
  estimated_cost: number;
  estimated_hours: number;
  created_at: string;
  client?: {
    full_name: string;
    phone: string;
  };
}

export default function DriverBookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery<BookingRequest[]>({
    queryKey: ["/api/driver/bookings"],
    queryFn: () => apiFetch<BookingRequest[]>("/bookings"),
  });

  const pending = bookings.filter((b) => b.status === "pending");
  const active = bookings.filter((b) => b.status === "accepted" || b.status === "ongoing");
  const history = bookings.filter((b) => b.status === "completed" || b.status === "cancelled" || b.status === "rejected");

  useEffect(() => {
    const channel = supabase
      .channel("driver-bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () =>
        qc.invalidateQueries({ queryKey: ["/api/driver/bookings"] })
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const { mutate: respond } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" | "ongoing" | "completed" }) =>
      apiRequest("PATCH", `/bookings/${id}`, { status }).then((r) => {
        if (!r.ok) throw new Error("Failed to update booking");
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/driver/bookings"] }),
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const s = makeStyles(colors);

  const sections: Array<{ title: string; items: BookingRequest[] }> = [
    ...(pending.length > 0 ? [{ title: "New Requests", items: pending }] : []),
    ...(active.length > 0 ? [{ title: "Active Trip", items: active }] : []),
  ];

  const listData: Array<{ type: "header"; title: string } | { type: "pending"; item: BookingRequest } | { type: "active"; item: BookingRequest } | { type: "history"; item: BookingRequest; index: number }> = [];

  if (pending.length > 0) {
    listData.push({ type: "header", title: "New Requests" });
    pending.forEach((item) => listData.push({ type: "pending", item }));
  }
  if (active.length > 0) {
    listData.push({ type: "header", title: "Active Trip" });
    active.forEach((item) => listData.push({ type: "active", item }));
  }
  if (history.length > 0) {
    listData.push({ type: "header", title: "Past Trips" });
    history.slice(0, 15).forEach((item, index) => listData.push({ type: "history", item, index }));
  }

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={[s.container, { paddingTop: insets.top + (Platform.OS === "web" ? 16 : 12) }]}
      data={listData}
      keyExtractor={(item, i) => {
        if (item.type === "header") return `header-${item.title}`;
        if (item.type === "history") return `history-${item.item.id}`;
        return item.item.id;
      }}
      renderItem={({ item }) => {
        if (item.type === "header") {
          return <Text style={s.sectionHeader}>{item.title}</Text>;
        }

        if (item.type === "pending") {
          const b = item.item;
          return (
            <View style={s.requestCard}>
              <View style={s.requestTop}>
                <View style={s.newBadge}>
                  <View style={s.pulseDot} />
                  <Text style={s.newBadgeText}>New Request</Text>
                </View>
                <Text style={s.timeText}>
                  {new Date(b.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>

              {b.client && (
                <View style={s.clientRow}>
                  <View style={s.clientAvatar}>
                    <Text style={s.clientInitial}>{b.client.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientName}>{b.client.full_name}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${b.client!.phone}`)}>
                      <Text style={s.clientPhone}>{b.client.phone}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={s.routeBox}>
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
                  <Text style={s.routeText} numberOfLines={1}>{b.pickup_location}</Text>
                </View>
                <View style={s.routeLine} />
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
                  <Text style={s.routeText} numberOfLines={1}>{b.destination}</Text>
                </View>
              </View>

              <View style={s.tripMeta}>
                <Text style={s.metaText}>{b.estimated_hours ?? 1} hr · ₦{(b.estimated_cost ?? 0).toLocaleString()}</Text>
              </View>

              <View style={s.actionRow}>
                <TouchableOpacity style={s.declineBtn} onPress={() => respond({ id: b.id, status: "rejected" })}>
                  <Text style={s.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.acceptBtn} onPress={() => respond({ id: b.id, status: "accepted" })}>
                  <Text style={s.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        if (item.type === "active") {
          const b = item.item;
          const isOngoing = b.status === "ongoing";
          return (
            <View style={[s.activeCard, isOngoing && s.activeCardOngoing]}>
              <View style={s.activeBadgeRow}>
                <View style={[s.activeBadge, isOngoing ? s.badgeOngoing : s.badgeAccepted]}>
                  <Text style={[s.activeBadgeText, { color: isOngoing ? "#7C3AED" : "#2563EB" }]}>
                    {isOngoing ? "In Progress" : "Accepted"}
                  </Text>
                </View>
              </View>
              <View style={s.routeBox}>
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
                  <Text style={s.routeText} numberOfLines={1}>{b.pickup_location}</Text>
                </View>
                <View style={s.routeLine} />
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
                  <Text style={s.routeText} numberOfLines={1}>{b.destination}</Text>
                </View>
              </View>
              <View style={s.activeActions}>
                {b.status === "accepted" && (
                  <TouchableOpacity style={s.startBtn} onPress={() => respond({ id: b.id, status: "ongoing" })}>
                    <Text style={s.startBtnText}>Start Trip</Text>
                  </TouchableOpacity>
                )}
                {b.status === "ongoing" && (
                  <TouchableOpacity style={s.completeBtn} onPress={() => respond({ id: b.id, status: "completed" })}>
                    <Text style={s.completeBtnText}>Complete Trip</Text>
                  </TouchableOpacity>
                )}
                {b.client && (
                  <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${b.client!.phone}`)}>
                    <Feather name="phone" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }

        if (item.type === "history") {
          const b = item.item;
          const statusColors: Record<string, string> = {
            completed: colors.success,
            cancelled: colors.destructive,
            rejected: colors.destructive,
          };
          return (
            <View style={s.historyRow}>
              <View style={[s.historyDot, { backgroundColor: statusColors[b.status] ?? colors.mutedForeground }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.historyRoute} numberOfLines={1}>{b.pickup_location} → {b.destination}</Text>
                <Text style={s.historyMeta} numberOfLines={1}>
                  {new Date(b.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · {b.status}
                </Text>
              </View>
              <Text style={s.historyAmount}>₦{(b.estimated_cost ?? 0).toLocaleString()}</Text>
            </View>
          );
        }

        return null;
      }}
      ListEmptyComponent={
        <View style={s.empty}>
          <Feather name="bell" size={40} color={colors.border} />
          <Text style={s.emptyTitle}>No requests yet</Text>
          <Text style={s.emptySub}>Go online to start receiving booking requests.</Text>
        </View>
      }
      contentContainerStyle={{
        paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
        flexGrow: listData.length === 0 ? 1 : undefined,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    sectionHeader: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },

    requestCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    requestTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    newBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D97706" },
    newBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#D97706" },
    timeText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    clientRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
    clientAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    clientInitial: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primary },
    clientName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    clientPhone: { fontSize: 13, color: colors.primary, fontFamily: "Inter_400Regular", marginTop: 2 },

    routeBox: { marginBottom: 12 },
    routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    routeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    routeLine: { width: 1, height: 12, backgroundColor: colors.border, marginLeft: 3.5, marginVertical: 2 },
    routeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },

    tripMeta: {
      paddingTop: 10,
      marginBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    metaText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },

    actionRow: { flexDirection: "row", gap: 10 },
    declineBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.destructive,
      alignItems: "center",
    },
    declineBtnText: { color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    acceptBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    acceptBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 },

    activeCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "#3B82F6",
      padding: 16,
    },
    activeCardOngoing: { borderColor: "#8B5CF6" },
    activeBadgeRow: { marginBottom: 12 },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
    badgeOngoing: { backgroundColor: "#EDE9FE" },
    badgeAccepted: { backgroundColor: "#DBEAFE" },
    activeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    activeActions: { flexDirection: "row", gap: 10, marginTop: 14 },
    startBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    startBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    completeBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: colors.success,
      alignItems: "center",
    },
    completeBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    callBtn: {
      width: 46,
      height: 46,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    historyDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    historyRoute: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    historyMeta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2, textTransform: "capitalize" },
    historyAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 10,
      paddingHorizontal: 32,
    },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
