import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { apiRequest, apiFetch } from "@/lib/queryClient";
import { useAuthStore, type ClientProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

interface NotifPrefs {
  booking_notifications: boolean;
  payment_notifications: boolean;
  message_notifications: boolean;
}

export default function ClientSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const clientProfile = profile as ClientProfile | null;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    booking_notifications: true,
    payment_notifications: true,
    message_notifications: true,
  });
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [savingNotif, setSavingNotif] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<NotifPrefs>("/notifications/preferences")
      .then(setNotifPrefs)
      .catch(() => {})
      .finally(() => setLoadingNotifs(false));
  }, []);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password changed successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleNotifToggle = async (key: keyof NotifPrefs, value: boolean) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    setSavingNotif(key);
    try {
      await apiRequest("PUT", "/notifications/preferences", { [key]: value });
    } catch {
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSavingNotif(null);
    }
  };

  const s = makeStyles(colors, insets.top + 16);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Identity Verification */}
      <TouchableOpacity
        style={[s.card, s.verifyCard]}
        onPress={() => router.push("/(client)/verify-nin")}
        activeOpacity={0.85}
      >
        <View style={s.verifyLeft}>
          <View
            style={[
              s.verifyIconBg,
              clientProfile?.nin_verified && s.verifyIconBgVerified,
            ]}
          >
            <Feather
              name="shield"
              size={20}
              color={clientProfile?.nin_verified ? colors.success : colors.warning}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.verifyTitle}>
              {clientProfile?.nin_verified ? "ID Verified" : "Verify Your Identity"}
            </Text>
            <Text style={s.verifyDesc}>
              {clientProfile?.nin_verified
                ? "Your NIN has been verified"
                : "Required to make a booking — tap to verify"}
            </Text>
          </View>
        </View>
        {!clientProfile?.nin_verified && (
          <Feather name="chevron-right" size={18} color={colors.warning} />
        )}
      </TouchableOpacity>

      {/* Change Password */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Feather name="lock" size={16} color={colors.primary} />
          <Text style={s.cardTitle}>Change Password</Text>
        </View>
        <Text style={s.cardSubtitle}>Keep your account secure</Text>

        <View style={s.field}>
          <Text style={s.label}>New Password</Text>
          <TextInput
            style={s.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Confirm Password</Text>
          <TextInput
            style={s.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[s.saveBtn, savingPassword && s.btnDisabled]}
          onPress={handleChangePassword}
          disabled={savingPassword}
          activeOpacity={0.85}
        >
          {savingPassword ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Feather name="lock" size={14} color="#FFF" />
              <Text style={s.saveBtnText}>Change Password</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Notification Preferences */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Feather name="bell" size={16} color={colors.primary} />
          <Text style={s.cardTitle}>Notification Preferences</Text>
        </View>
        <Text style={s.cardSubtitle}>Choose which notifications you receive</Text>

        {loadingNotifs ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: 16 }}
          />
        ) : (
          <>
            <NotifRow
              label="Booking Notifications"
              desc="Updates and confirmations for your bookings"
              value={notifPrefs.booking_notifications}
              disabled={savingNotif !== null}
              colors={colors}
              onToggle={(v) => handleNotifToggle("booking_notifications", v)}
            />
            <View style={s.notifDivider} />
            <NotifRow
              label="Payment Notifications"
              desc="Payment confirmations and receipts"
              value={notifPrefs.payment_notifications}
              disabled={savingNotif !== null}
              colors={colors}
              onToggle={(v) => handleNotifToggle("payment_notifications", v)}
            />
            <View style={s.notifDivider} />
            <NotifRow
              label="Message Notifications"
              desc="Alerts when you receive new messages"
              value={notifPrefs.message_notifications}
              disabled={savingNotif !== null}
              colors={colors}
              onToggle={(v) => handleNotifToggle("message_notifications", v)}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function NotifRow({
  label,
  desc,
  value,
  disabled,
  colors,
  onToggle,
}: {
  label: string;
  desc: string;
  value: boolean;
  disabled: boolean;
  colors: ReturnType<typeof useColors>;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_500Medium",
            color: colors.foreground,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: colors.mutedForeground,
            marginTop: 2,
          }}
        >
          {desc}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      backgroundColor: colors.primary,
      paddingTop: topPad,
      paddingBottom: 18,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
    },

    card: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    verifyCard: { flexDirection: "row", alignItems: "center", padding: 14 },
    verifyLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    verifyIconBg: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.warning + "18",
      alignItems: "center",
      justifyContent: "center",
    },
    verifyIconBgVerified: { backgroundColor: colors.success + "18" },
    verifyTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    verifyDesc: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 3,
    },
    cardTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    cardSubtitle: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 16,
    },

    field: { marginBottom: 14 },
    label: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },

    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 2,
    },
    saveBtnText: {
      color: "#FFF",
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    btnDisabled: { opacity: 0.55 },

    notifDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 2,
    },
  });
}
