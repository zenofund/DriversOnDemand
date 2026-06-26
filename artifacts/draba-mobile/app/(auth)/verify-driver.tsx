import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

const STEPS = [
  {
    icon: "user-check" as const,
    title: "Identity Verification",
    description: "Your NIN and government ID will be verified by our team.",
  },
  {
    icon: "shield" as const,
    title: "Background Check",
    description: "A background check will be conducted for passenger safety.",
  },
  {
    icon: "truck" as const,
    title: "Vehicle Inspection",
    description: "Your vehicle details and documents will be reviewed.",
  },
  {
    icon: "check-circle" as const,
    title: "Approval",
    description: "Once approved, you can go online and start accepting bookings.",
  },
];

export default function VerifyDriverScreen() {
  const colors = useColors();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.replace("/(auth)/login");
  };

  const s = makeStyles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.heroSection}>
        <View style={s.iconCircle}>
          <Feather name="clock" size={40} color={colors.primary} />
        </View>
        <Text style={s.title}>Verification Pending</Text>
        <Text style={s.subtitle}>
          Your driver account is under review. We'll notify you once you're approved.
        </Text>
      </View>

      <View style={s.stepsCard}>
        <Text style={s.stepsTitle}>Verification Process</Text>
        {STEPS.map((step, index) => (
          <View key={step.title} style={[s.step, index < STEPS.length - 1 && s.stepBorder]}>
            <View style={s.stepIcon}>
              <Feather name={step.icon} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={s.infoCard}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={s.infoText}>
          Verification typically takes 24–48 hours. You'll receive an email when your account is approved.
        </Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={15} color={colors.mutedForeground} />
        <Text style={s.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    heroSection: { alignItems: "center", marginBottom: 32 },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 10,
      lineHeight: 22,
    },
    stepsCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    stepsTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    step: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      paddingBottom: 14,
      marginBottom: 14,
    },
    stepBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    stepIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 4 },
    stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: 14,
      marginBottom: 24,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 18,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
    },
    logoutText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  });
}
