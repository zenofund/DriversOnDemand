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
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/queryClient";
import { useBookingStore } from "@/store/bookingStore";
import { useAuthStore } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

export default function BookingConfirmScreen() {
  const colors = useColors();
  const { pickupLocation, destination, selectedDriverId, selectedDriver, estimatedHours, setEstimate, reset } =
    useBookingStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(estimatedHours ?? 1);

  const driver = selectedDriver as any;
  const hourlyRate: number = driver?.hourly_rate ?? 0;
  const estimatedCost = Math.round(hourlyRate * hours);

  if (!selectedDriverId || !driver || !pickupLocation || !destination) {
    return (
      <View style={styles(colors).center}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={styles(colors).emptyTitle}>No booking selected</Text>
        <TouchableOpacity onPress={() => router.replace("/(client)/")}>
          <Text style={styles(colors).link}>Go back to search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const bookingRes = await apiRequest("POST", "/bookings", {
        driver_id: selectedDriverId,
        pickup_location: pickupLocation,
        destination,
        estimated_cost: estimatedCost,
        estimated_hours: hours,
      });

      if (!bookingRes.ok) {
        const err = await bookingRes.json().catch(() => ({ error: "Booking failed" }));
        throw new Error(err.error ?? "Failed to create booking");
      }
      const booking = await bookingRes.json();

      const payRes = await apiRequest("POST", "/payments/initialize-booking", {
        booking_id: booking.id,
        amount: estimatedCost,
      });

      if (!payRes.ok) {
        const err = await payRes.json().catch(() => ({ error: "Payment init failed" }));
        throw new Error(err.error ?? "Could not initialize payment");
      }
      const { authorization_url } = await payRes.json();

      if (authorization_url) {
        const result = await WebBrowser.openBrowserAsync(authorization_url);
        if (result.type === "cancel" || result.type === "dismiss") {
          Alert.alert(
            "Payment Pending",
            "You can complete the payment later from your bookings.",
            [{ text: "OK", onPress: () => router.replace("/(client)/bookings") }]
          );
        } else {
          reset();
          router.replace("/(client)/active-booking");
        }
      } else {
        reset();
        router.replace("/(client)/active-booking");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

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
      <Text style={s.pageTitle}>Confirm Booking</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>Driver</Text>
        <View style={s.driverRow}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>
              {driver.full_name?.charAt(0)?.toUpperCase() ?? "D"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.driverName}>{driver.full_name}</Text>
            <View style={s.ratingRow}>
              <Feather name="star" size={13} color={colors.warning} />
              <Text style={s.ratingText}>
                {driver.rating?.toFixed(1) ?? "5.0"} · {driver.total_trips ?? 0} trips
              </Text>
            </View>
          </View>
          <View style={s.rateBox}>
            <Text style={s.rateAmount}>₦{hourlyRate.toLocaleString()}</Text>
            <Text style={s.rateLabel}>/hr</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Trip Details</Text>
        <View style={s.routeRow}>
          <View style={[s.dot, { backgroundColor: colors.primary }]} />
          <Text style={s.location} numberOfLines={2}>{pickupLocation}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routeRow}>
          <View style={[s.dot, { backgroundColor: colors.destructive }]} />
          <Text style={s.location} numberOfLines={2}>{destination}</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Duration</Text>
        <View style={s.hoursPicker}>
          <TouchableOpacity
            style={s.hourBtn}
            onPress={() => setHours(Math.max(1, hours - 1))}
          >
            <Feather name="minus" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.hoursValue}>{hours} hr{hours !== 1 ? "s" : ""}</Text>
          <TouchableOpacity
            style={s.hourBtn}
            onPress={() => setHours(hours + 1)}
          >
            <Feather name="plus" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Cost Breakdown</Text>
        <View style={s.costRow}>
          <Text style={s.costKey}>Rate</Text>
          <Text style={s.costVal}>₦{hourlyRate.toLocaleString()} / hr</Text>
        </View>
        <View style={s.costRow}>
          <Text style={s.costKey}>Duration</Text>
          <Text style={s.costVal}>{hours} hr{hours !== 1 ? "s" : ""}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.costRow}>
          <Text style={s.totalKey}>Total</Text>
          <Text style={s.totalVal}>₦{estimatedCost.toLocaleString()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.confirmBtn, loading && s.btnDisabled]}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="credit-card" size={18} color={colors.primaryForeground} />
            <Text style={s.confirmBtnText}>Confirm & Pay ₦{estimatedCost.toLocaleString()}</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
        <Text style={s.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 14 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    link: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 },
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
      marginBottom: 12,
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
    driverName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    ratingText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    rateBox: { alignItems: "flex-end" },
    rateAmount: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.primary },
    rateLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    routeLine: {
      width: 1,
      height: 16,
      backgroundColor: colors.border,
      marginLeft: 4.5,
      marginVertical: 3,
    },
    location: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    hoursPicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
    hourBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    hoursValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, minWidth: 70, textAlign: "center" },
    costRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    costKey: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    costVal: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    totalKey: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    totalVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.primary },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
    },
    confirmBtnText: { color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 16 },
    btnDisabled: { opacity: 0.6 },
    cancelBtn: { alignItems: "center", paddingVertical: 12 },
    cancelBtnText: { color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 },
  });
}
