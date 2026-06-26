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
import { useAuthStore, type ClientProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

export default function ClientProfileScreen() {
  const colors = useColors();
  const { user, profile, setProfile, logout } = useAuthStore();
  const clientProfile = profile as ClientProfile | null;

  const [fullName, setFullName] = useState(clientProfile?.full_name ?? "");
  const [phone, setPhone] = useState(clientProfile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const handleLogout = async () => {
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

  const styles = makeStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 : 16,
          paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {(clientProfile?.full_name || user?.email || "C").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{clientProfile?.full_name ?? "Client"}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
        {clientProfile?.nin_verified && (
          <View style={styles.verifiedBadge}>
            <Feather name="shield" size={12} color={colors.success} />
            <Text style={styles.verifiedText}>ID Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="08012345678"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{user?.email ?? ""}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={[styles.dangerBtn, loggingOut && styles.btnDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={styles.dangerBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    avatarSection: { alignItems: "center", marginBottom: 28 },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarInitial: { fontSize: 32, fontFamily: "Inter_700Bold", color: colors.primary },
    name: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    email: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.muted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      marginTop: 8,
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
    inputDisabled: {
      opacity: 0.6,
      justifyContent: "center",
    },
    inputDisabledText: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
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
