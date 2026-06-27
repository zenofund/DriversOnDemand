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
  Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { apiRequest, apiFetch } from "@/lib/queryClient";
import { useAuthStore, type DriverProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

interface Bank {
  name: string;
  code: string;
}

interface NotifPrefs {
  booking_notifications: boolean;
  payment_notifications: boolean;
  message_notifications: boolean;
}

export default function DriverSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const driverProfile = profile as DriverProfile | null;

  const [licenseNo, setLicenseNo] = useState(driverProfile?.license_no ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(driverProfile?.hourly_rate ?? ""));
  const [savingProfile, setSavingProfile] = useState(false);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState(driverProfile?.bank_code ?? "");
  const [accountNumber, setAccountNumber] = useState(driverProfile?.account_number ?? "");
  const [accountName, setAccountName] = useState(driverProfile?.account_name ?? "");
  const [savingBank, setSavingBank] = useState(false);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

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
    setLoadingBanks(true);
    apiFetch<Bank[]>("/banks")
      .then(setBanks)
      .catch(() => {})
      .finally(() => setLoadingBanks(false));

    apiFetch<NotifPrefs>("/notifications/preferences")
      .then(setNotifPrefs)
      .catch(() => {})
      .finally(() => setLoadingNotifs(false));
  }, []);

  const selectedBank = banks.find((b) => b.code === selectedBankCode);
  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleSaveDriverDetails = async () => {
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert("Validation", "Please enter a valid hourly rate.");
      return;
    }
    setSavingProfile(true);
    try {
      const updates: Record<string, unknown> = { hourly_rate: rate };
      if (licenseNo.trim().length >= 5) updates.license_no = licenseNo.trim();
      const res = await apiRequest("PATCH", "/drivers/profile", updates);
      if (!res.ok) throw new Error(((await res.json()) as any).error ?? "Failed");
      Alert.alert("Saved", "Driver details updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBank = async () => {
    if (!selectedBankCode) {
      Alert.alert("Validation", "Please select a bank.");
      return;
    }
    const clean = accountNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      Alert.alert("Validation", "Account number must be exactly 10 digits.");
      return;
    }
    setSavingBank(true);
    try {
      const res = await apiRequest("PATCH", "/drivers/bank-account", {
        bank_code: selectedBankCode,
        account_number: clean,
      });
      if (!res.ok) throw new Error(((await res.json()) as any).error ?? "Failed");
      const data = (await res.json()) as any;
      setAccountName(data.account_name ?? "");
      Alert.alert("Saved", "Bank account verified and saved.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save bank account.");
    } finally {
      setSavingBank(false);
    }
  };

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
    <>
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

        {/* Driver Details */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Feather name="user" size={16} color={colors.primary} />
            <Text style={s.cardTitle}>Driver Details</Text>
          </View>
          <Text style={s.cardSubtitle}>Update your license and hourly rate</Text>

          <View style={s.field}>
            <Text style={s.label}>License Number</Text>
            <TextInput
              style={s.input}
              value={licenseNo}
              onChangeText={setLicenseNo}
              placeholder="e.g. LAG-1234567"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
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

          <TouchableOpacity
            style={[s.saveBtn, savingProfile && s.btnDisabled]}
            onPress={handleSaveDriverDetails}
            disabled={savingProfile}
            activeOpacity={0.85}
          >
            {savingProfile ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="save" size={14} color="#FFF" />
                <Text style={s.saveBtnText}>Save Details</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bank Account */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Feather name="credit-card" size={16} color={colors.primary} />
            <Text style={s.cardTitle}>Bank Account</Text>
          </View>
          <Text style={s.cardSubtitle}>Your account for receiving payments</Text>

          <View style={s.field}>
            <Text style={s.label}>Bank</Text>
            <TouchableOpacity
              style={s.bankPickerBtn}
              onPress={() => {
                setBankSearch("");
                setBankPickerVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  s.bankPickerText,
                  !selectedBank && { color: colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {loadingBanks
                  ? "Loading banks..."
                  : selectedBank
                  ? selectedBank.name
                  : "Select your bank"}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Account Number</Text>
            <TextInput
              style={s.input}
              value={accountNumber}
              onChangeText={(t) => setAccountNumber(t.replace(/\D/g, "").slice(0, 10))}
              placeholder="0123456789"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {accountName !== "" && (
            <View style={s.accountNameBadge}>
              <Feather name="check-circle" size={13} color={colors.success} />
              <Text style={s.accountNameText}>{accountName}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.saveBtn, savingBank && s.btnDisabled]}
            onPress={handleSaveBank}
            disabled={savingBank}
            activeOpacity={0.85}
          >
            {savingBank ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="shield" size={14} color="#FFF" />
                <Text style={s.saveBtnText}>Verify & Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

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

      {/* Bank Picker Modal */}
      <Modal
        visible={bankPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBankPickerVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setBankPickerVisible(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.bankSearchInput}
              value={bankSearch}
              onChangeText={setBankSearch}
              placeholder="Search banks..."
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <FlatList
              data={filteredBanks}
              keyExtractor={(b) => b.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.bankItem,
                    item.code === selectedBankCode && s.bankItemActive,
                  ]}
                  onPress={() => {
                    setSelectedBankCode(item.code);
                    setBankPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      s.bankItemText,
                      item.code === selectedBankCode && s.bankItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.code === selectedBankCode && (
                    <Feather name="check" size={15} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={s.emptyText}>
                  {loadingBanks ? "Loading…" : "No banks found"}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
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
      backgroundColor: colors.dark,
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
      backgroundColor: "rgba(255,255,255,0.1)",
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

    bankPickerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 13,
    },
    bankPickerText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      flex: 1,
    },

    accountNameBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.success + "18",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 14,
    },
    accountNameText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.success,
      flex: 1,
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

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "80%",
      paddingTop: 12,
    },
    modalHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 12,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    bankSearchInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      marginHorizontal: 16,
      marginBottom: 8,
    },
    bankItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    bankItemActive: { backgroundColor: colors.primary + "12" },
    bankItemText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    bankItemTextActive: {
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    emptyText: {
      textAlign: "center",
      color: colors.mutedForeground,
      padding: 24,
      fontFamily: "Inter_400Regular",
    },
  });
}
