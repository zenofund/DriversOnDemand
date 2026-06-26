import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

interface ActiveBooking {
  id: string;
  status: "pending" | "accepted" | "ongoing" | "completed" | "cancelled";
  pickup_location: string;
  destination: string;
  estimated_cost: number;
  estimated_hours: number;
  created_at: string;
  driver?: {
    id: string;
    full_name: string;
    phone: string;
    rating: number;
    vehicle_type?: string;
  };
}

const STEPS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "ongoing", label: "In Progress" },
];

const STATUS_MSG: Record<string, string> = {
  pending: "Waiting for driver to accept…",
  accepted: "Driver accepted! On their way.",
  ongoing: "Trip is in progress.",
};

export default function ActiveBookingScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState(false);

  const { data: bookings = [], isLoading } = useQuery<ActiveBooking[]>({
    queryKey: ["/api/bookings/active"],
    queryFn: () => apiFetch<ActiveBooking[]>("/bookings"),
    select: (all) =>
      all.filter((b) => b.status === "pending" || b.status === "accepted" || b.status === "ongoing"),
  });

  const booking = bookings[0] ?? null;

  useEffect(() => {
    if (!booking) return;
    const channel = supabase
      .channel(`booking-${booking.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${booking.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [booking?.id]);

  const handleComplete = async () => {
    if (!booking) return;
    Alert.alert("Complete Trip", "Mark this trip as completed?", [
      { text: "No", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          setCompleting(true);
          try {
            const res = await apiRequest("PATCH", `/bookings/${booking.id}`, { status: "completed" });
            if (!res.ok) throw new Error("Failed");
            queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            Alert.alert("Trip Completed", "Your trip has been marked as complete.", [
              { text: "OK", onPress: () => router.replace("/(client)/bookings") },
            ]);
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  const s = makeStyles(colors);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={s.center}>
        <View style={s.emptyIcon}>
          <Feather name="check" size={28} color={colors.success} />
        </View>
        <Text style={s.emptyTitle}>No active trip</Text>
        <Text style={s.emptySub}>You don't have any active bookings right now.</Text>
        <TouchableOpacity style={s.bookBtn} onPress={() => router.replace("/(client)/")}>
          <Text style={s.bookBtnText}>Book a Driver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === booking.status);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Status hero */}
      <View style={s.statusHero}>
        <Text style={s.statusLabel}>{STATUS_MSG[booking.status] ?? "Processing…"}</Text>

        <View style={s.progressRow}>
          {STEPS.map((step, i) => (
            <React.Fragment key={step.key}>
              <View style={[s.stepDot, i <= stepIndex && s.stepDotActive]} />
              {i < STEPS.length - 1 && (
                <View style={[s.stepLine, i < stepIndex && s.stepLineActive]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={s.stepLabelsRow}>
          {STEPS.map((step, i) => (
            <Text
              key={step.key}
              style={[s.stepLabelText, i <= stepIndex && s.stepLabelActive]}
            >
              {step.label}
            </Text>
          ))}
        </View>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={{ paddingBottom: booking.status === "ongoing" ? 140 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver */}
        {booking.driver && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Your Driver</Text>
            <View style={s.driverRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{booking.driver.full_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.driverName}>{booking.driver.full_name}</Text>
                <View style={s.ratingRow}>
                  <Feather name="star" size={13} color={colors.warning} />
                  <Text style={s.ratingText}>{booking.driver.rating?.toFixed(1) ?? "5.0"}</Text>
                  {booking.driver.vehicle_type && (
                    <>
                      <Text style={s.dot}>·</Text>
                      <Text style={s.ratingText}>{booking.driver.vehicle_type}</Text>
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={s.callBtn}
                onPress={() => Linking.openURL(`tel:${booking.driver!.phone}`)}
              >
                <Feather name="phone" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.callBtn, { backgroundColor: colors.secondary, marginLeft: 8 }]}
                onPress={() => router.push(`/(client)/chat?bookingId=${booking.id}`)}
              >
                <Feather name="message-circle" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.divider} />

        {/* Route */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Trip Details</Text>
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
            <Text style={s.routeText} numberOfLines={2}>{booking.pickup_location}</Text>
          </View>
          <View style={s.routeLine} />
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
            <Text style={s.routeText} numberOfLines={2}>{booking.destination}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Cost */}
        <View style={s.section}>
          <View style={s.costRow}>
            <View>
              <Text style={s.sectionLabel}>Estimated Cost</Text>
              <Text style={s.bigValue}>₦{(booking.estimated_cost ?? 0).toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.sectionLabel}>Duration</Text>
              <Text style={s.bigValue}>{booking.estimated_hours ?? 1} hr</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {booking.status === "ongoing" && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.completeBtn, completing && s.btnDisabled]}
            onPress={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#FFFFFF" />
                <Text style={s.completeBtnText}>Mark as Completed</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#DCFCE7",
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    bookBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 13,
      borderRadius: 12,
      marginTop: 8,
    },
    bookBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },

    statusHero: {
      backgroundColor: colors.dark,
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "ios" ? 60 : Platform.OS === "web" ? 76 : 24,
      paddingBottom: 24,
    },
    statusLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 20, textAlign: "center" },
    progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.2)" },
    stepDotActive: { backgroundColor: colors.accent },
    stepLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 4 },
    stepLineActive: { backgroundColor: colors.accent },
    stepLabelsRow: { flexDirection: "row", justifyContent: "space-between" },
    stepLabelText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", flex: 1, textAlign: "center" },
    stepLabelActive: { color: "rgba(255,255,255,0.85)", fontFamily: "Inter_600SemiBold" },

    body: { flex: 1 },
    section: { paddingHorizontal: 20, paddingVertical: 16 },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 10,
    },
    divider: { height: 1, backgroundColor: colors.border },

    driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary },
    driverName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    dot: { color: colors.mutedForeground, fontSize: 13 },
    ratingText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    callBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    routeDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4, flexShrink: 0 },
    routeLine: { width: 1, height: 16, backgroundColor: colors.border, marginLeft: 4, marginVertical: 3 },
    routeText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },

    costRow: { flexDirection: "row", justifyContent: "space-between" },
    bigValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground },

    bottomBar: {
      padding: 20,
      paddingBottom: Platform.OS === "ios" ? 36 : 20,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    completeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 16,
    },
    completeBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 },
    btnDisabled: { opacity: 0.55 },
  });
}
