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
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiFetch, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
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
  const qc = useQueryClient();
  const { user } = useAuthStore();

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => qc.invalidateQueries({ queryKey: ["/api/driver/bookings"] })
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

  const renderPending = ({ item }: { item: BookingRequest }) => (
    <View style={s.pendingCard}>
      <View style={s.requestHeader}>
        <View style={s.newBadge}>
          <Text style={s.newBadgeText}>New Request</Text>
        </View>
        <Text style={s.timeText}>
          {new Date(item.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>

      {item.client && (
        <View style={s.clientRow}>
          <View style={s.clientAvatar}>
            <Text style={s.clientInitial}>{item.client.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.clientName}>{item.client.full_name}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.client!.phone}`)}>
              <Text style={s.clientPhone}>{item.client.phone}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.routeBox}>
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
          <Text style={s.routeText} numberOfLines={1}>{item.pickup_location}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
          <Text style={s.routeText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>

      <View style={s.tripMeta}>
        <Text style={s.metaText}>{item.estimated_hours ?? 1} hr · ₦{(item.estimated_cost ?? 0).toLocaleString()}</Text>
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity
          style={s.rejectBtn}
          onPress={() => respond({ id: item.id, status: "rejected" })}
        >
          <Feather name="x" size={16} color={colors.destructive} />
          <Text style={s.rejectBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.acceptBtn}
          onPress={() => respond({ id: item.id, status: "accepted" })}
        >
          <Feather name="check" size={16} color={colors.primaryForeground} />
          <Text style={s.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActive = ({ item }: { item: BookingRequest }) => (
    <View style={s.activeCard}>
      <View style={s.activeBadgeRow}>
        <View style={[s.activeBadge, item.status === "ongoing" ? s.ongoingBadge : s.acceptedBadge]}>
          <Text style={s.activeBadgeText}>
            {item.status === "ongoing" ? "Ongoing" : "Accepted"}
          </Text>
        </View>
      </View>
      <View style={s.routeBox}>
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
          <Text style={s.routeText} numberOfLines={1}>{item.pickup_location}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
          <Text style={s.routeText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>
      <View style={s.activeActions}>
        {item.status === "accepted" && (
          <TouchableOpacity
            style={s.startBtn}
            onPress={() => respond({ id: item.id, status: "ongoing" })}
          >
            <Text style={s.startBtnText}>Start Trip</Text>
          </TouchableOpacity>
        )}
        {item.status === "ongoing" && (
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => respond({ id: item.id, status: "completed" })}
          >
            <Text style={s.doneBtnText}>Complete Trip</Text>
          </TouchableOpacity>
        )}
        {item.client && (
          <TouchableOpacity
            style={s.callBtn}
            onPress={() => Linking.openURL(`tel:${item.client!.phone}`)}
          >
            <Feather name="phone" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      style={[s.container, { paddingTop: Platform.OS === "web" ? 67 : 0 }]}
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <>
          {pending.length > 0 && (
            <>
              <Text style={s.sectionHeader}>New Requests</Text>
              {pending.map((item) => (
                <View key={item.id}>{renderPending({ item })}</View>
              ))}
            </>
          )}
          {active.length > 0 && (
            <>
              <Text style={s.sectionHeader}>Active Trip</Text>
              {active.map((item) => (
                <View key={item.id}>{renderActive({ item })}</View>
              ))}
            </>
          )}
          {pending.length === 0 && active.length === 0 && !isLoading && (
            <View style={s.empty}>
              <Feather name="bell" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No requests yet</Text>
              <Text style={s.emptySub}>Go online to start receiving booking requests.</Text>
            </View>
          )}
          {history.length > 0 && (
            <>
              <Text style={s.sectionHeader}>Past Bookings</Text>
              {history.slice(0, 10).map((item) => (
                <View key={item.id} style={s.historyItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyRoute} numberOfLines={1}>
                      {item.pickup_location} → {item.destination}
                    </Text>
                    <Text style={s.historyStatus}>{item.status}</Text>
                  </View>
                  <Text style={s.historyAmount}>₦{(item.estimated_cost ?? 0).toLocaleString()}</Text>
                </View>
              ))}
            </>
          )}
        </>
      }
      contentContainerStyle={[
        { paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) },
      ]}
      refreshControl={
        <RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    sectionHeader: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    pendingCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    newBadge: { backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    newBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#d97706" },
    timeText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    clientRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    clientAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    clientInitial: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primary },
    clientName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    clientPhone: { fontSize: 13, color: colors.primary, fontFamily: "Inter_400Regular" },
    routeBox: { marginBottom: 10 },
    routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    routeDot: { width: 8, height: 8, borderRadius: 4 },
    routeLine: { width: 1, height: 12, backgroundColor: colors.border, marginLeft: 3.5, marginVertical: 2 },
    routeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground },
    tripMeta: { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 12 },
    metaText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    actionRow: { flexDirection: "row", gap: 10 },
    rejectBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.destructive,
    },
    rejectBtnText: { color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    acceptBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    acceptBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    activeCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    activeBadgeRow: { marginBottom: 10 },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
    ongoingBadge: { backgroundColor: "#ede9fe" },
    acceptedBadge: { backgroundColor: "#dbeafe" },
    activeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    activeActions: { flexDirection: "row", gap: 10, marginTop: 12 },
    startBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    startBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    doneBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.success,
      alignItems: "center",
    },
    doneBtnText: { color: colors.successForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    callBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    historyItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyRoute: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    historyStatus: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2, textTransform: "capitalize" },
    historyAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  });
}
