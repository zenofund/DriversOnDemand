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
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore, type DriverProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function DriverProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile, setProfile, logout } = useAuthStore();
  const driverProfile = profile as DriverProfile | null;

  const [fullName, setFullName] = useState(driverProfile?.full_name ?? "");
  const [phone, setPhone] = useState(driverProfile?.phone ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(driverProfile?.hourly_rate ?? ""));
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const firstName = driverProfile?.full_name?.split(" ")[0] ?? "Driver";

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
        const err = await res.json().catch(() => ({ error: "Failed" }));
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

  const handleLogout = () => setShowLogoutDialog(true);

  const doLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.replace("/(auth)/login");
  };

  const { theme, setTheme } = useThemeStore();

  const s = makeStyles(colors, insets.top + 20);
  const isOnline = driverProfile?.online_status === "online";
  const initials = (driverProfile?.full_name || user?.email || "D").charAt(0).toUpperCase();

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* Dark profile header */}
      <View style={s.hero}>
        <View style={s.avatarRing}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.heroGreeting}>Hello, {firstName}</Text>
        <Text style={s.heroName}>{driverProfile?.full_name ?? "Driver"}</Text>
        <Text style={s.heroEmail}>{user?.email ?? ""}</Text>
        <View style={s.heroBadges}>
          {driverProfile?.verified && (
            <View style={s.verifiedBadge}>
              <Feather name="check-circle" size={12} color={colors.success} />
              <Text style={s.verifiedText}>Verified Driver</Text>
            </View>
          )}
          <View style={[s.statusBadge, isOnline ? s.badgeOnline : s.badgeOffline]}>
            <View style={[s.statusDot, { backgroundColor: isOnline ? colors.success : "rgba(255,255,255,0.4)" }]} />
            <Text style={[s.statusText, { color: isOnline ? colors.success : "rgba(255,255,255,0.6)" }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Feather name="star" size={14} color={colors.accent} />
            <Text style={s.statValue}>{driverProfile?.rating?.toFixed(1) ?? "5.0"}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Feather name="navigation" size={14} color={colors.accent} />
            <Text style={s.statValue}>{driverProfile?.total_trips ?? 0}</Text>
            <Text style={s.statLabel}>Trips</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Feather name="dollar-sign" size={14} color={colors.accent} />
            <Text style={s.statValue}>₦{(driverProfile?.hourly_rate ?? 0).toLocaleString()}</Text>
            <Text style={s.statLabel}>/ hr</Text>
          </View>
        </View>
      </View>

      {/* Form fields */}
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
          <View style={s.disabledInput}>
            <Text style={s.disabledInputText}>{user?.email ?? ""}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saving && s.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Account menu */}
      <View style={s.menuSection}>
        <TouchableOpacity style={s.menuItem} onPress={() => router.push("/(driver)/earnings")}>
          <Feather name="trending-up" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>Earnings</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={s.menuDivider} />
        <TouchableOpacity style={s.menuItem} onPress={() => router.push("/(driver)/bookings")}>
          <Feather name="calendar" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>Booking History</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={s.menuDivider} />
        <TouchableOpacity style={s.menuItem} onPress={() => router.push("/(driver)/reviews")}>
          <Feather name="star" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>My Reviews</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={s.menuDivider} />
        <TouchableOpacity style={s.menuItem} onPress={() => router.push("/(driver)/settings")}>
          <Feather name="settings" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>Settings</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Theme toggle */}
      <View style={s.themeSection}>
        <Text style={s.themeSectionTitle}>Appearance</Text>
        <View style={s.themePills}>
          {(["light", "dark", "system"] as ThemeMode[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.themePill, theme === opt && s.themePillActive]}
              onPress={() => setTheme(opt)}
              activeOpacity={0.8}
            >
              <Feather
                name={opt === "light" ? "sun" : opt === "dark" ? "moon" : "smartphone"}
                size={14}
                color={theme === opt ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={[s.themePillText, theme === opt && s.themePillTextActive]}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        destructive
        onDismiss={() => setShowLogoutDialog(false)}
        onConfirm={doLogout}
      />
    </ScrollView>
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
      alignItems: "center",
    },
    avatarRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: colors.dark },
    heroGreeting: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.5)",
      marginBottom: 2,
    },
    heroName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    heroEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 3 },
    heroBadges: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 20 },
    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(22,163,74,0.15)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    verifiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.success },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    badgeOnline: { backgroundColor: "rgba(22,163,74,0.12)" },
    badgeOffline: { backgroundColor: "rgba(255,255,255,0.08)" },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

    statsRow: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      width: "100%",
    },
    statItem: { flex: 1, alignItems: "center", gap: 5 },
    statValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)" },
    statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 4 },

    section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, marginBottom: 7 },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    themeSection: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
    },
    themeSectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    themePills: {
      flexDirection: "row",
      gap: 8,
    },
    themePill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    themePillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themePillText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    themePillTextActive: {
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
    disabledInput: {
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    disabledInputText: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    saveBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
    btnDisabled: { opacity: 0.55 },

    menuSection: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    menuItemText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground },
    menuDivider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },

    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 20,
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.destructive,
    },
    logoutText: { color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });
}
