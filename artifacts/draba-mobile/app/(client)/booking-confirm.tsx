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
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/queryClient";
import { useBookingStore } from "@/store/bookingStore";
import { useColors } from "@/hooks/useColors";

export default function BookingConfirmScreen() {
  const colors = useColors();
  const { pickupLocation, destination, selectedDriverId, selectedDriver, estimatedHours, reset } =
    useBookingStore();
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(estimatedHours ?? 1);

  const driver = selectedDriver as any;
  const hourlyRate: number = driver?.hourly_rate ?? 0;
  const estimatedCost = Math.round(hourlyRate * hours);

  const s = makeStyles(colors);

  if (!selectedDriverId || !driver || !pickupLocation || !destination) {
    return (
      <View style={s.center}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={s.emptyTitle}>No booking selected</Text>
        <TouchableOpacity style={s.goBtn} onPress={() => router.replace("/(client)/")}>
          <Text style={s.goBtnText}>Go back</Text>
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
          Alert.alert("Payment Pending", "You can complete the payment later from your bookings.", [
            { text: "OK", onPress: () => router.replace("/(client)/bookings") },
          ]);
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

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Driver hero banner */}
      <View style={s.driverBanner}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.driverBannerContent}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{driver.full_name?.charAt(0)?.toUpperCase() ?? "D"}</Text>
          </View>
          <Text style={s.driverName}>{driver.full_name}</Text>
          <View style={s.ratingRow}>
            <Feather name="star" size={14} color={colors.accent} />
            <Text style={s.ratingText}>{driver.rating?.toFixed(1) ?? "5.0"}</Text>
            <Text style={s.ratingDot}>·</Text>
            <Text style={s.ratingText}>{driver.total_trips ?? 0} trips</Text>
          </View>
          <Text style={s.rate}>₦{hourlyRate.toLocaleString()} / hr</Text>
        </View>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Route */}
        <View style={s.row}>
          <Text style={s.rowLabel}>Route</Text>
          <View style={s.routeBlock}>
            <View style={s.routeRow}>
              <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
              <Text style={s.routeText} numberOfLines={2}>{pickupLocation}</Text>
            </View>
            <View style={s.routeLine} />
            <View style={s.routeRow}>
              <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
              <Text style={s.routeText} numberOfLines={2}>{destination}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Duration picker */}
        <View style={s.row}>
          <Text style={s.rowLabel}>Duration</Text>
          <View style={s.durationPicker}>
            <TouchableOpacity
              style={s.durationBtn}
              onPress={() => setHours(Math.max(1, hours - 1))}
            >
              <Feather name="minus" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={s.durationValue}>{hours} hr{hours !== 1 ? "s" : ""}</Text>
            <TouchableOpacity style={s.durationBtn} onPress={() => setHours(hours + 1)}>
              <Feather name="plus" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.divider} />

        {/* Cost breakdown */}
        <View style={s.costSection}>
          <View style={s.costRow}>
            <Text style={s.costKey}>Rate</Text>
            <Text style={s.costVal}>₦{hourlyRate.toLocaleString()} × {hours} hr{hours !== 1 ? "s" : ""}</Text>
          </View>
          <View style={[s.costRow, s.totalRow]}>
            <Text style={s.totalKey}>Total</Text>
            <Text style={s.totalVal}>₦{estimatedCost.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.confirmBtn, loading && s.btnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="credit-card" size={18} color="#FFFFFF" />
              <Text style={s.confirmText}>Confirm & Pay — ₦{estimatedCost.toLocaleString()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    goBtn: { marginTop: 8 },
    goBtnText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },

    driverBanner: {
      backgroundColor: colors.dark,
      paddingTop: Platform.OS === "ios" ? 56 : Platform.OS === "web" ? 72 : 24,
      paddingBottom: 28,
      paddingHorizontal: 20,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    driverBannerContent: { alignItems: "center" },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarText: { fontSize: 30, fontFamily: "Inter_700Bold", color: colors.primary },
    driverName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 6 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    ratingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },
    ratingDot: { color: "rgba(255,255,255,0.3)", fontSize: 13 },
    rate: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.accent, marginTop: 10 },

    body: { flex: 1 },

    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    rowLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      minWidth: 70,
      paddingTop: 2,
    },
    routeBlock: { flex: 1, marginLeft: 16 },
    routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    routeDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4, flexShrink: 0 },
    routeLine: { width: 1, height: 14, backgroundColor: colors.border, marginLeft: 4, marginVertical: 3 },
    routeText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },

    durationPicker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    durationBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    durationValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, minWidth: 72, textAlign: "center" },

    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },

    costSection: { paddingHorizontal: 20, paddingVertical: 16 },
    costRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    costKey: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    costVal: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 0 },
    totalKey: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    totalVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary },

    bottomBar: {
      padding: 20,
      paddingBottom: Platform.OS === "ios" ? 36 : 20,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
    },
    confirmText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 },
    btnDisabled: { opacity: 0.55 },
  });
}
