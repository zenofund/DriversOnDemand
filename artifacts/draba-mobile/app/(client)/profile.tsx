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
import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore, type ClientProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

export default function ClientProfileScreen() {
  const colors = useColors();
  const { user, profile, setProfile, logout } = useAuthStore();
  const clientProfile = profile as ClientProfile | null;

  const [fullName, setFullName] = useState(clientProfile?.full_name ?? "");
  const [phone, setPhone] = useState(clientProfile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("PATCH", "/clients/me", {
        full_name: fullName.trim(),
        phone: phone.trim(),
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

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const s = makeStyles(colors);
  const initials = (clientProfile?.full_name || user?.email || "C").charAt(0).toUpperCase();

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" />

      {/* Avatar section */}
      <View style={s.avatarSection}>
        <View style={s.avatarRing}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.userName}>{clientProfile?.full_name ?? "Client"}</Text>
        <Text style={s.userEmail}>{user?.email ?? ""}</Text>
        {clientProfile?.nin_verified ? (
          <View style={s.verifiedBadge}>
            <Feather name="shield" size={12} color={colors.success} />
            <Text style={s.verifiedText}>ID Verified</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.unverifiedBadge}
            onPress={() => router.push("/(client)/verify-nin")}
          >
            <Feather name="shield" size={12} color={colors.warning} />
            <Text style={s.unverifiedText}>Verify your ID</Text>
            <Feather name="chevron-right" size={12} color={colors.warning} />
          </TouchableOpacity>
        )}
      </View>

      {/* Form fields */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Personal Information</Text>

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

      {/* Account actions */}
      <View style={s.menuSection}>
        <TouchableOpacity style={s.menuItem} onPress={() => router.push("/(client)/bookings")}>
          <Feather name="calendar" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>My Bookings</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={s.menuDivider} />
        <TouchableOpacity style={s.menuItem} onPress={() => router.push("/(client)/verify-nin")}>
          <Feather name="shield" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>Identity Verification</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    avatarSection: {
      alignItems: "center",
      paddingTop: Platform.OS === "ios" ? 60 : Platform.OS === "web" ? 76 : 24,
      paddingBottom: 24,
      paddingHorizontal: 20,
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
    avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: colors.primary },
    userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    userEmail: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3 },
    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#DCFCE7",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      marginTop: 10,
    },
    verifiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.success },
    unverifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#FEF3C7",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      marginTop: 10,
    },
    unverifiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.warning },

    section: { paddingHorizontal: 20, paddingBottom: 8 },
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
      marginTop: 20,
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
