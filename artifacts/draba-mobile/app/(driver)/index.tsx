import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiRequest } from "@/lib/queryClient";
import { useAuthStore, type DriverProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

interface EarningsSummary {
  total_earned: number;
  this_week: number;
  completed_trips: number;
  pending_payout: number;
}

interface RecentBooking {
  id: string;
  status: string;
  pickup_location: string;
  destination: string;
  estimated_cost: number;
  created_at: string;
}

export default function DriverDashboardScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { profile, setProfile } = useAuthStore();
  const driverProfile = profile as DriverProfile | null;

  const [toggling, setToggling] = useState(false);
  const isOnline = driverProfile?.online_status === "online";

  const { data: earnings } = useQuery<EarningsSummary>({
    queryKey: ["/api/drivers/earnings/summary"],
    queryFn: () => apiFetch<EarningsSummary>("/drivers/earnings"),
    select: (data: any) => ({
      total_earned: data.total_earned ?? data.totalEarned ?? 0,
      this_week: data.this_week ?? data.thisWeek ?? 0,
      completed_trips: data.completed_trips ?? data.completedTrips ?? 0,
      pending_payout: data.pending_payout ?? data.pendingPayout ?? 0,
    }),
  });

  const { data: recentBookings = [] } = useQuery<RecentBooking[]>({
    queryKey: ["/api/bookings/driver/recent"],
    queryFn: () => apiFetch<RecentBooking[]>("/bookings?limit=5"),
    select: (data: any) => (Array.isArray(data) ? data.slice(0, 5) : []),
  });

  const handleToggleOnline = async (value: boolean) => {
    if (toggling) return;

    if (value) {
      // Request location before going online
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Required", "Please allow location access to go online.");
        return;
      }

      setToggling(true);
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await apiRequest("PATCH", "/drivers/me/location", {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const res = await apiRequest("POST", "/drivers/toggle-online");
        if (!res.ok) throw new Error("Failed to go online");
        const updated = await apiRequest("GET", "/drivers/me");
        if (updated.ok) {
          const profile = await updated.json();
          setProfile(profile);
        } else {
          setProfile({ ...driverProfile!, online_status: "online" });
        }
      } catch (err: any) {
        Alert.alert("Error", err.message ?? "Could not update status.");
      } finally {
        setToggling(false);
      }
    } else {
      setToggling(true);
      try {
        const res = await apiRequest("POST", "/drivers/toggle-online");
        if (!res.ok) throw new Error("Failed to go offline");
        const updated = await apiRequest("GET", "/drivers/me");
        if (updated.ok) {
          const profile = await updated.json();
          setProfile(profile);
        } else {
          setProfile({ ...driverProfile!, online_status: "offline" });
        }
      } catch (err: any) {
        Alert.alert("Error", err.message ?? "Could not update status.");
      } finally {
        setToggling(false);
      }
    }
  };

  const s = makeStyles(colors);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[
        s.content,
        {
          paddingTop: Platform.OS === "web" ? 67 : 16,
          paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={s.onlineCard}>
        <View style={s.onlineLeft}>
          <View style={[s.statusDot, isOnline ? s.dotOnline : s.dotOffline]} />
          <View>
            <Text style={s.onlineTitle}>{isOnline ? "You're Online" : "You're Offline"}</Text>
            <Text style={s.onlineSub}>
              {isOnline ? "Accepting new bookings" : "Not visible to clients"}
            </Text>
          </View>
        </View>
        {toggling ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
        )}
      </View>

      <View style={s.statsGrid}>
        <StatCard
          label="Total Earned"
          value={`₦${(earnings?.total_earned ?? 0).toLocaleString()}`}
          icon="trending-up"
          colors={colors}
        />
        <StatCard
          label="This Week"
          value={`₦${(earnings?.this_week ?? 0).toLocaleString()}`}
          icon="calendar"
          colors={colors}
        />
        <StatCard
          label="Trips Done"
          value={String(earnings?.completed_trips ?? driverProfile?.total_trips ?? 0)}
          icon="map-pin"
          colors={colors}
        />
        <StatCard
          label="Rating"
          value={driverProfile?.rating?.toFixed(1) ?? "5.0"}
          icon="star"
          colors={colors}
        />
      </View>

      {recentBookings.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          {recentBookings.map((b) => (
            <View key={b.id} style={s.activityItem}>
              <View style={s.activityIcon}>
                <Feather name="navigation" size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activityRoute} numberOfLines={1}>
                  {b.pickup_location} → {b.destination}
                </Text>
                <Text style={s.activityStatus}>{b.status}</Text>
              </View>
              <Text style={s.activityAmount}>₦{(b.estimated_cost ?? 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: string;
  colors: ReturnType<typeof useColors>;
}) {
  const s = StyleSheet.create({
    card: {
      width: "48%",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    value: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    label: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
  });

  return (
    <View style={s.card}>
      <View style={s.iconBox}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    onlineCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    onlineLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    dotOnline: { backgroundColor: colors.success },
    dotOffline: { backgroundColor: colors.mutedForeground },
    onlineTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    onlineSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    section: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activityIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    activityRoute: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    activityStatus: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textTransform: "capitalize", marginTop: 2 },
    activityAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
  });
}
