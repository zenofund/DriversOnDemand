import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { apiFetch } from "@/lib/queryClient";
import { useColors } from "@/hooks/useColors";

interface Booking {
  id: string;
  status: "pending" | "accepted" | "ongoing" | "completed" | "cancelled" | "rejected";
  pickup_location: string;
  destination: string;
  estimated_cost: number;
  created_at: string;
  driver?: {
    full_name: string;
    phone: string;
    rating: number;
  };
}

const STATUS: Record<Booking["status"], { label: string; color: string; bar: string }> = {
  pending:   { label: "Pending",   color: "#D97706", bar: "#F59E0B" },
  accepted:  { label: "Accepted",  color: "#2563EB", bar: "#3B82F6" },
  ongoing:   { label: "Ongoing",   color: "#7C3AED", bar: "#8B5CF6" },
  completed: { label: "Completed", color: "#16A34A", bar: "#22C55E" },
  cancelled: { label: "Cancelled", color: "#DC2626", bar: "#EF4444" },
  rejected:  { label: "Rejected",  color: "#DC2626", bar: "#EF4444" },
};

export default function ClientBookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    queryFn: () => apiFetch<Booking[]>("/bookings"),
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  const active = bookings.filter((b) => b.status === "ongoing" || b.status === "accepted" || b.status === "pending");
  const past = bookings.filter((b) => b.status === "completed" || b.status === "cancelled" || b.status === "rejected");

  const s = makeStyles(colors);

  const renderBooking = useCallback(
    ({ item, index }: { item: Booking; index: number }) => {
      const cfg = STATUS[item.status] ?? STATUS.pending;
      const isActive = item.status === "ongoing" || item.status === "accepted";
      return (
        <TouchableOpacity
          style={s.bookingRow}
          activeOpacity={0.75}
          onPress={() => { if (isActive) router.push("/(client)/active-booking"); }}
        >
          <View style={[s.statusBar, { backgroundColor: cfg.bar }]} />
          <View style={s.bookingContent}>
            <View style={s.bookingTop}>
              <View style={s.routeCol}>
                <Text style={s.locationText} numberOfLines={1}>{item.pickup_location}</Text>
                <View style={s.routeConnector} />
                <Text style={s.locationText} numberOfLines={1}>{item.destination}</Text>
              </View>
              {isActive && (
                <View style={s.liveChip}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>Live</Text>
                </View>
              )}
            </View>

            <View style={s.bookingMeta}>
              <View style={[s.statusTag, { backgroundColor: cfg.color + "18" }]}>
                <Text style={[s.statusTagText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <Text style={s.metaDate}>{formatDate(item.created_at)}</Text>
              <Text style={s.metaCost}>₦{(item.estimated_cost ?? 0).toLocaleString()}</Text>
            </View>

            {item.driver && (
              <View style={s.driverRow}>
                <Feather name="user" size={12} color={colors.mutedForeground} />
                <Text style={s.driverName}>{item.driver.full_name}</Text>
                <Feather name="star" size={11} color={colors.warning} />
                <Text style={s.driverRating}>{item.driver.rating?.toFixed(1) ?? "–"}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [colors]
  );

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
      data={[...active, ...past]}
      keyExtractor={(b) => b.id}
      renderItem={renderBooking}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        active.length > 0 ? (
          <Text style={s.sectionLabel}>Active Trips</Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Feather name="calendar" size={40} color={colors.border} />
          <Text style={s.emptyTitle}>No bookings yet</Text>
          <Text style={s.emptySub}>Book a driver from the Book tab.</Text>
        </View>
      }
      contentContainerStyle={{
        paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
        flexGrow: bookings.length === 0 ? 1 : undefined,
      }}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },

    bookingRow: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statusBar: { width: 4 },
    bookingContent: { flex: 1, padding: 16 },

    bookingTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    routeCol: { flex: 1, marginRight: 8 },
    locationText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    routeConnector: {
      width: 1,
      height: 10,
      backgroundColor: colors.border,
      marginLeft: 1,
      marginVertical: 3,
    },

    liveChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#DCFCE7",
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 20,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#16A34A" },
    liveText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#16A34A" },

    bookingMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    statusTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    statusTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    metaDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, flex: 1 },
    metaCost: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },

    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    driverName: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, flex: 1 },
    driverRating: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 10,
    },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });
}
