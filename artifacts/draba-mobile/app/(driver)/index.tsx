import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
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
  const insets = useSafeAreaInsets();
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

  const handleToggle = async () => {
    if (toggling) return;
    if (!isOnline) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Required", "Please allow location access to go online.");
        return;
      }
    }
    setToggling(true);

    // Optimistically flip UI immediately so the button responds at once
    const newStatus: "online" | "offline" = isOnline ? "offline" : "online";
    setProfile({ ...driverProfile!, online_status: newStatus } as DriverProfile);

    try {
      if (newStatus === "online") {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await apiRequest("PATCH", "/drivers/me/location", {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        } catch {
          // Location update is best-effort; continue
        }
      }

      const res = await apiRequest("POST", "/drivers/toggle-online");
      if (!res.ok) {
        // Revert optimistic update on failure
        setProfile({ ...driverProfile!, online_status: isOnline ? "online" : "offline" } as DriverProfile);
        throw new Error("Failed to update availability.");
      }

      // Confirm with fresh server data
      try {
        const fresh = await apiFetch<DriverProfile>("/drivers/me");
        setProfile(fresh);
      } catch {
        // Keep optimistic update — server toggle succeeded
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not update status.");
    } finally {
      setToggling(false);
    }
  };

  const topPad = insets.top + 20;
  const s = makeStyles(colors, topPad);
  const statusColor = isOnline ? colors.success : colors.mutedForeground;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* Dark hero */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroGreeting}>Welcome back</Text>
            <Text style={s.heroName}>{driverProfile?.full_name?.split(" ")[0] ?? "Driver"}</Text>
          </View>
          <View style={[s.statusPill, isOnline ? s.pillOnline : s.pillOffline]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusPillText, { color: statusColor }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={s.toggleArea}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>
              {isOnline ? "You're accepting rides" : "You're not visible"}
            </Text>
            <Text style={s.toggleSub}>
              {isOnline
                ? "Clients can see and book you"
                : "Tap to start receiving requests"}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.toggleBtn, isOnline ? s.toggleBtnOnline : s.toggleBtnOffline]}
            onPress={handleToggle}
            disabled={toggling}
            activeOpacity={0.8}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={isOnline ? colors.dark : "#FFFFFF"} />
            ) : (
              <Feather
                name={isOnline ? "zap" : "zap-off"}
                size={20}
                color={isOnline ? colors.dark : "#FFFFFF"}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        <StatTile
          label="Total Earned"
          value={`₦${(earnings?.total_earned ?? 0).toLocaleString()}`}
          icon="trending-up"
          colors={colors}
        />
        <StatTile
          label="This Week"
          value={`₦${(earnings?.this_week ?? 0).toLocaleString()}`}
          icon="calendar"
          colors={colors}
        />
        <StatTile
          label="Trips Done"
          value={String(earnings?.completed_trips ?? driverProfile?.total_trips ?? 0)}
          icon="navigation"
          colors={colors}
        />
        <StatTile
          label="Rating"
          value={driverProfile?.rating?.toFixed(1) ?? "5.0"}
          icon="star"
          colors={colors}
        />
      </View>

      {/* Recent activity */}
      {recentBookings.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          {recentBookings.map((b, i) => {
            const statusColors: Record<string, string> = {
              completed: colors.success,
              cancelled: colors.destructive,
              rejected: colors.destructive,
              ongoing: colors.primary,
              accepted: colors.primary,
              pending: colors.warning,
            };
            return (
              <View
                key={b.id}
                style={[s.activityRow, i < recentBookings.length - 1 && s.activityRowBorder]}
              >
                <View
                  style={[
                    s.activityDot,
                    { backgroundColor: statusColors[b.status] ?? colors.mutedForeground },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.activityRoute} numberOfLines={1}>
                    {b.pickup_location} → {b.destination}
                  </Text>
                  <Text style={s.activityDate}>
                    {new Date(b.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                    {" · "}
                    {b.status}
                  </Text>
                </View>
                <Text style={s.activityAmount}>₦{(b.estimated_cost ?? 0).toLocaleString()}</Text>
              </View>
            );
          })}
        </View>
      )}

      {recentBookings.length === 0 && !toggling && (
        <View style={s.emptyActivity}>
          <Feather name="clock" size={28} color={colors.border} />
          <Text style={s.emptyText}>No recent activity</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatTile({
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
  return (
    <View style={{ width: "48%", padding: 16, marginBottom: 12 }}>
      <Feather name={icon as any} size={18} color={colors.primary} style={{ marginBottom: 10 }} />
      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground }}>
        {value}
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    hero: {
      backgroundColor: colors.dark,
      paddingHorizontal: 20,
      paddingTop: topPad,
      paddingBottom: 28,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    heroGreeting: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.5)",
    },
    heroName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 2 },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    pillOnline: { backgroundColor: "rgba(22,163,74,0.15)" },
    pillOffline: { backgroundColor: "rgba(255,255,255,0.08)" },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

    toggleArea: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    toggleTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    toggleSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.5)",
    },
    toggleBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    toggleBtnOnline: { backgroundColor: colors.accent },
    toggleBtnOffline: { backgroundColor: "rgba(255,255,255,0.14)" },

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    section: { paddingTop: 20, paddingHorizontal: 20 },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 13,
      gap: 12,
    },
    activityRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    activityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    activityRoute: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    activityDate: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
      textTransform: "capitalize",
    },
    activityAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },

    emptyActivity: { alignItems: "center", paddingTop: 40, gap: 10 },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });
}
