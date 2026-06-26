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

const STATUS_STEPS = ["pending", "accepted", "ongoing", "completed"];

export default function ActiveBookingScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState(false);

  const { data: bookings = [], isLoading } = useQuery<ActiveBooking[]>({
    queryKey: ["/api/bookings/active"],
    queryFn: () => apiFetch<ActiveBooking[]>("/bookings"),
    select: (all) =>
      all.filter(
        (b) => b.status === "pending" || b.status === "accepted" || b.status === "ongoing"
      ),
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
    Alert.alert("Confirm Completion", "Mark this trip as completed?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Complete",
        onPress: async () => {
          setCompleting(true);
          try {
            const res = await apiRequest("PATCH", `/bookings/${booking.id}`, { status: "completed" });
            if (!res.ok) throw new Error("Failed to complete booking");
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

  const stepIndex = booking ? STATUS_STEPS.indexOf(booking.status) : -1;

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
        <Feather name="check-circle" size={40} color={colors.success} />
        <Text style={s.emptyTitle}>No active trip</Text>
        <Text style={s.emptySub}>You don't have any active bookings right now.</Text>
        <TouchableOpacity style={s.goBtn} onPress={() => router.replace("/(client)/")}>
          <Text style={s.goBtnText}>Book a Driver</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      <View style={s.statusCard}>
        <View style={s.statusProgress}>
          {STATUS_STEPS.slice(0, 3).map((step, i) => (
            <React.Fragment key={step}>
              <View style={[s.stepDot, i <= stepIndex && s.stepDotActive]} />
              {i < 2 && <View style={[s.stepLine, i < stepIndex && s.stepLineActive]} />}
            </React.Fragment>
          ))}
        </View>
        <View style={s.statusLabels}>
          {["Pending", "Accepted", "On The Way"].map((label, i) => (
            <Text
              key={label}
              style={[s.stepLabel, i <= stepIndex && s.stepLabelActive]}
            >
              {label}
            </Text>
          ))}
        </View>
        <Text style={s.statusMessage}>
          {booking.status === "pending" && "Waiting for driver to accept…"}
          {booking.status === "accepted" && "Driver accepted! They're on their way."}
          {booking.status === "ongoing" && "Trip is in progress."}
        </Text>
      </View>

      {booking.driver && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Your Driver</Text>
          <View style={s.driverRow}>
            <View style={s.avatar}>
              <Text style={s.avatarInitial}>
                {booking.driver.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.driverName}>{booking.driver.full_name}</Text>
              <View style={s.ratingRow}>
                <Feather name="star" size={13} color={colors.warning} />
                <Text style={s.ratingText}>{booking.driver.rating?.toFixed(1) ?? "5.0"}</Text>
                {booking.driver.vehicle_type ? (
                  <>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.ratingText}>{booking.driver.vehicle_type}</Text>
                  </>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              style={s.callBtn}
              onPress={() => Linking.openURL(`tel:${booking.driver!.phone}`)}
            >
              <Feather name="phone" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.cardLabel}>Trip Details</Text>
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
          <Text style={s.location} numberOfLines={2}>{booking.pickup_location}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
          <Text style={s.location} numberOfLines={2}>{booking.destination}</Text>
        </View>
      </View>

      <View style={s.card}>
        <View style={s.costRow}>
          <View>
            <Text style={s.cardLabel}>Estimated Cost</Text>
            <Text style={s.costValue}>₦{(booking.estimated_cost ?? 0).toLocaleString()}</Text>
          </View>
          <View>
            <Text style={s.cardLabel}>Duration</Text>
            <Text style={s.costValue}>{booking.estimated_hours ?? 1} hr</Text>
          </View>
        </View>
      </View>

      {booking.status === "ongoing" && (
        <TouchableOpacity
          style={[s.completeBtn, completing && s.btnDisabled]}
          onPress={handleComplete}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color={colors.successForeground} />
          ) : (
            <>
              <Feather name="check" size={18} color={colors.successForeground} />
              <Text style={s.completeBtnText}>Mark as Completed</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 14 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    goBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 8,
    },
    goBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    statusCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    statusProgress: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 6 },
    stepDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.border,
    },
    stepDotActive: { backgroundColor: colors.primary },
    stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
    stepLineActive: { backgroundColor: colors.primary },
    statusLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    stepLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", flex: 1 },
    stepLabelActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    statusMessage: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, textAlign: "center" },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    cardLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary },
    driverName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    dot: { color: colors.mutedForeground, fontSize: 13 },
    ratingText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    callBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    routeLine: { width: 1, height: 16, backgroundColor: colors.border, marginLeft: 4.5, marginVertical: 3 },
    location: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    costRow: { flexDirection: "row", justifyContent: "space-between" },
    costValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    completeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 16,
    },
    completeBtnText: { color: colors.successForeground, fontFamily: "Inter_700Bold", fontSize: 16 },
    btnDisabled: { opacity: 0.6 },
  });
}
