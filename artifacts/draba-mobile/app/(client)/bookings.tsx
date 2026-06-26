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

const STATUS_CONFIG: Record<
  Booking["status"],
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#d97706", bg: "#fef3c7" },
  accepted: { label: "Accepted", color: "#2563eb", bg: "#dbeafe" },
  ongoing: { label: "Ongoing", color: "#7c3aed", bg: "#ede9fe" },
  completed: { label: "Completed", color: "#16a34a", bg: "#dcfce7" },
  cancelled: { label: "Cancelled", color: "#dc2626", bg: "#fee2e2" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fee2e2" },
};

export default function ClientBookingsScreen() {
  const colors = useColors();

  const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    queryFn: () => apiFetch<Booking[]>("/bookings"),
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderBooking = useCallback(
    ({ item }: { item: Booking }) => {
      const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
      const isActive = item.status === "ongoing" || item.status === "accepted";
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => {
            if (isActive) router.push("/(client)/active-booking");
          }}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>

          <View style={styles.route}>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.location} numberOfLines={1}>{item.pickup_location}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
              <Text style={styles.location} numberOfLines={1}>{item.destination}</Text>
            </View>
          </View>

          {item.driver && (
            <View style={styles.driverRow}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
              <Text style={styles.driverName}>{item.driver.full_name}</Text>
              <Feather name="star" size={13} color={colors.warning} style={{ marginLeft: 8 }} />
              <Text style={styles.driverRating}>{item.driver.rating?.toFixed(1) ?? "–"}</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.cost}>₦{(item.estimated_cost ?? 0).toLocaleString()}</Text>
            {isActive && (
              <View style={styles.activeChip}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>View trip</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [colors]
  );

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={renderBooking}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySub}>Book your first driver from the Book tab.</Text>
            </View>
          }
          scrollEnabled={!!bookings.length}
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, gap: 12 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    date: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    route: { marginBottom: 10 },
    routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    routeLine: {
      width: 1,
      height: 14,
      backgroundColor: colors.border,
      marginLeft: 3.5,
      marginVertical: 2,
    },
    location: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    driverName: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    driverRating: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cost: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    activeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    activeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
  });
}
