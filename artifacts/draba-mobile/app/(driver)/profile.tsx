import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore, type DriverProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

export default function DriverProfileScreen() {
  const colors = useColors();
  const { user, profile, setProfile, logout } = useAuthStore();
  const driverProfile = profile as DriverProfile | null;

  const [fullName, setFullName] = useState(driverProfile?.full_name ?? "");
  const [phone, setPhone] = useState(driverProfile?.phone ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(driverProfile?.hourly_rate ?? ""));
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name is required.");
      return;
    }
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert("Error", "Please enter a valid hourly rate.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("PATCH", "/drivers/me", {
        full_name: fullName.trim(),
        phone: phone.trim(),
        hourly_rate: rate,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to update" }));
        throw new Error(err.error ?? "Failed to update");
      }
      const updated = await res.json();
      setProfile(updated);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await supabase.auth.signOut();
          logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
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
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarInitial}>
            {(driverProfile?.full_name || user?.email || "D").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={s.name}>{driverProfile?.full_name ?? "Driver"}</Text>
        <Text style={s.email}>{user?.email ?? ""}</Text>

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Feather name="star" size={14} color={colors.warning} />
            <Text style={s.statValue}>{driverProfile?.rating?.toFixed(1) ?? "5.0"}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Feather name="map-pin" size={14} color={colors.primary} />
            <Text style={s.statValue}>{driverProfile?.total_trips ?? 0}</Text>
            <Text style={s.statLabel}>Trips</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <View
              style={[
                s.onlineDot,
                driverProfile?.online_status === "online" ? s.dotOnline : s.dotOffline,
              ]}
            />
            <Text style={s.statValue}>
              {driverProfile?.online_status === "online" ? "Online" : "Offline"}
            </Text>
            <Text style={s.statLabel}>Status</Text>
          </View>
        </View>

        {driverProfile?.verified && (
          <View style={s.verifiedBadge}>
            <Feather name="check-circle" size={12} color={colors.success} />
            <Text style={s.verifiedText}>Verified Driver</Text>
          </View>
        )}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Profile Information</Text>

        <View style={s.field}>
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Phone Number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="08012345678"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Hourly Rate (₦)</Text>
          <TextInput
            style={s.input}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="e.g. 5000"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <View style={[s.input, s.inputDisabled]}>
            <Text style={s.inputDisabledText}>{user?.email ?? ""}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saving && s.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={s.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={[s.dangerBtn, loggingOut && s.btnDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={s.dangerBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    avatarSection: { alignItems: "center", marginBottom: 24 },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarInitial: { fontSize: 34, fontFamily: "Inter_700Bold", color: colors.primary },
    name: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    email: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginTop: 16,
      gap: 20,
    },
    statItem: { flex: 1, alignItems: "center", gap: 4 },
    statValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    statLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    statDivider: { width: 1, height: 36, backgroundColor: colors.border },
    onlineDot: { width: 10, height: 10, borderRadius: 5 },
    dotOnline: { backgroundColor: colors.success },
    dotOffline: { backgroundColor: colors.mutedForeground },
    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.muted,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      marginTop: 10,
    },
    verifiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.success },
    section: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    field: { marginBottom: 14 },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6 },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    inputDisabled: { opacity: 0.6, justifyContent: "center" },
    inputDisabledText: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 4,
    },
    saveBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    btnDisabled: { opacity: 0.6 },
    dangerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1.5,
      borderColor: colors.destructive,
      borderRadius: 10,
      paddingVertical: 13,
    },
    dangerBtnText: { color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });
}
