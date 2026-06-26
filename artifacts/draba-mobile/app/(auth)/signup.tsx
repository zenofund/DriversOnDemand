import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

const DARK = "#0D0F15";
const DARK_INPUT = "rgba(255,255,255,0.08)";
const DARK_BORDER = "rgba(255,255,255,0.12)";
const GOLD = "#C4A225";
const WHITE = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.50)";

type Role = "client" | "driver";

export default function SignupScreen() {
  const [role, setRole] = useState<Role>("client");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !phone || !email || !password) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    if (role === "driver" && !hourlyRate) {
      Alert.alert("Error", "Please enter your hourly rate.");
      return;
    }
    setLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const { supabase } = await import("@/lib/supabase");

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { role, full_name: fullName, phone } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup failed");

      const token = data.session?.access_token;
      const profileData: Record<string, unknown> = {
        full_name: fullName,
        phone,
        email: email.trim(),
      };
      if (role === "driver") {
        profileData.hourly_rate = parseFloat(hourlyRate);
        profileData.license_no = "PENDING";
      }

      const base = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
        : "http://localhost:8080/api";

      const res = await fetch(`${base}/${role === "driver" ? "drivers" : "clients"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create profile" }));
        throw new Error(err.error ?? "Failed to create profile");
      }

      Alert.alert(
        "Account Created",
        role === "driver"
          ? "Your driver account has been created. Please verify your identity."
          : "Your account has been created. Please sign in.",
        [{ text: "Continue", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Signup Failed", err.message ?? "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>

        <View style={s.heading}>
          <Text style={s.title}>Create account</Text>
          <Text style={s.sub}>Join Draba — Nigeria's driver platform</Text>
        </View>

        <View style={s.roleRow}>
          {(["client", "driver"] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.roleBtn, role === r && s.roleBtnActive]}
              onPress={() => setRole(r)}
              activeOpacity={0.75}
            >
              <Feather
                name={r === "client" ? "user" : "truck"}
                size={16}
                color={role === r ? DARK : MUTED}
              />
              <Text style={[s.roleBtnText, role === r && s.roleBtnTextActive]}>
                {r === "client" ? "Client" : "Driver"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
              placeholderTextColor={MUTED}
              autoCapitalize="words"
              selectionColor={GOLD}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Phone Number</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="08012345678"
              placeholderTextColor={MUTED}
              keyboardType="phone-pad"
              selectionColor={GOLD}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={GOLD}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPass}
                selectionColor={GOLD}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          {role === "driver" && (
            <View style={s.field}>
              <Text style={s.label}>Hourly Rate (₦)</Text>
              <TextInput
                style={s.input}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder="e.g. 5000"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                selectionColor={GOLD}
              />
            </View>
          )}

          <TouchableOpacity
            style={[s.cta, loading && s.ctaDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={DARK} />
            ) : (
              <Text style={s.ctaText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={s.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  scroll: { flexGrow: 1, paddingBottom: 60 },

  topBar: {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DARK_INPUT,
    alignItems: "center",
    justifyContent: "center",
  },

  heading: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: WHITE },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED, marginTop: 6 },

  roleRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DARK_BORDER,
    backgroundColor: DARK_INPUT,
  },
  roleBtnActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  roleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: MUTED,
  },
  roleBtnTextActive: { color: DARK },

  form: { paddingHorizontal: 24 },
  field: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: MUTED,
    marginBottom: 8,
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    backgroundColor: DARK_INPUT,
    borderWidth: 1,
    borderColor: DARK_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: WHITE,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { position: "absolute", right: 14, padding: 4 },

  cta: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: { color: DARK, fontSize: 16, fontFamily: "Inter_700Bold" },

  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
