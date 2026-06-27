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
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore, type ClientProfile } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

export default function VerifyNINScreen() {
  const colors = useColors();
  const { profile, setProfile } = useAuthStore();
  const clientProfile = profile as ClientProfile | null;

  const [nin, setNin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (clientProfile?.nin_verified || submitted) {
    return (
      <View style={makeStyles(colors).successContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={makeStyles(colors).successIcon}>
          <Feather name="shield" size={36} color={makeStyles(colors).successIcon.color as string} />
        </View>
        <Text style={makeStyles(colors).successTitle}>
          {submitted ? "Verification Submitted" : "Already Verified"}
        </Text>
        <Text style={makeStyles(colors).successSub}>
          {submitted
            ? "Your NIN has been submitted for review. We'll notify you once it's verified — usually within 24 hours."
            : "Your identity is already verified. You're all set to book drivers."}
        </Text>
        <TouchableOpacity
          style={makeStyles(colors).doneBtn}
          onPress={() => router.replace("/(client)/")}
        >
          <Text style={makeStyles(colors).doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSubmit = async () => {
    const cleaned = nin.replace(/\s/g, "");
    if (cleaned.length !== 13) {
      Alert.alert("Invalid NIN", "Your NIN must be exactly 13 digits.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/clients/me/nin", { nin: cleaned });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Could not submit NIN");
      }
      const updated = await res.json();
      setProfile(updated);
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not submit NIN. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const s = makeStyles(colors);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </TouchableOpacity>

      <View style={s.iconArea}>
        <View style={s.iconCircle}>
          <Feather name="shield" size={32} color={colors.primary} />
        </View>
      </View>

      <Text style={s.title}>Verify Your Identity</Text>
      <Text style={s.sub}>
        Nigerian law requires identity verification for ride-booking services. Your NIN is securely
        stored and only used for compliance purposes.
      </Text>

      <View style={s.infoBox}>
        <Feather name="info" size={15} color={colors.primary} />
        <Text style={s.infoText}>
          Enter your 13-digit National Identification Number (NIN). You can find it on your NIN slip
          or by dialing *346# on your phone.
        </Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>National Identification Number (NIN)</Text>
        <TextInput
          style={s.input}
          value={nin}
          onChangeText={(v) => setNin(v.replace(/\D/g, "").slice(0, 13))}
          placeholder="Enter your 13-digit NIN"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          maxLength={13}
          autoCorrect={false}
        />
        <Text style={s.fieldHint}>{nin.length}/13 digits</Text>
      </View>

      <TouchableOpacity
        style={[s.submitBtn, (submitting || nin.length !== 13) && s.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting || nin.length !== 13}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Feather name="lock" size={17} color="#FFFFFF" />
            <Text style={s.submitBtnText}>Submit for Verification</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={s.privacy}>
        Your NIN is encrypted and never shared with third parties. Only Draba compliance staff can
        access verification records.
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: 24,
      paddingTop: Platform.OS === "ios" ? 60 : Platform.OS === "web" ? 76 : 24,
      paddingBottom: 60,
    },

    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },

    iconArea: { alignItems: "center", marginBottom: 20 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      color: colors.primary,
    },

    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 10 },
    sub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 22,
      marginBottom: 20,
    },

    infoBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 14,
      marginBottom: 24,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 20,
    },

    field: { marginBottom: 20 },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 20,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      letterSpacing: 3,
    },
    fieldHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "right" },

    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      marginBottom: 16,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 },

    privacy: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 18,
    },

    successContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    successIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: "#DCFCE7",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      color: colors.success,
    },
    successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 10 },
    successSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 28,
    },
    doneBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
    },
    doneBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });
}
