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
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { apiFetch } from "@/lib/queryClient";

const DARK = "#0D0F15";
const DARK_INPUT = "rgba(255,255,255,0.08)";
const DARK_BORDER = "rgba(255,255,255,0.12)";
const GOLD = "#C4A225";
const WHITE = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.50)";

export default function LoginScreen() {
  const { setSession, setUser, setRole, setProfile } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user || !data.session) throw new Error("Login failed");

      setSession(data.session);
      setUser(data.user);
      const role = data.user.user_metadata?.role ?? null;
      setRole(role);

      if (role === "driver") {
        try {
          const profile = await apiFetch<Record<string, unknown>>("/drivers/me");
          setProfile(profile as any);
          if (!profile.verified) {
            router.replace("/(auth)/verify-driver");
            return;
          }
        } catch {}
        router.replace("/(driver)/");
      } else if (role === "client") {
        try {
          const profile = await apiFetch<Record<string, unknown>>("/clients/me");
          setProfile(profile as any);
        } catch {}
        router.replace("/(client)/");
      } else {
        Alert.alert("Error", "Unknown account role. Please contact support.");
      }
    } catch (err: any) {
      Alert.alert("Login Failed", err.message ?? "Invalid email or password.");
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
        <View style={s.hero}>
          <View style={s.logoRing}>
            <Text style={s.logoLetter}>D</Text>
          </View>
          <Text style={s.brand}>DRABA</Text>
          <Text style={s.tagline}>Your trusted driver, on demand</Text>
        </View>

        <View style={s.form}>
          <Text style={s.formHeading}>Sign in</Text>

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
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPass}
                selectionColor={GOLD}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[s.cta, loading && s.ctaDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={DARK} />
            ) : (
              <Text style={s.ctaText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={s.footerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  hero: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingBottom: 48,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoLetter: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: DARK,
    lineHeight: 46,
  },
  brand: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: 8,
  },

  form: {
    paddingHorizontal: 24,
  },
  formHeading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    marginBottom: 24,
  },
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
    marginBottom: 0,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    padding: 4,
  },

  cta: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: {
    color: DARK,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  footerLink: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
