import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: "client" | "driver";
  content: string;
  created_at: string;
}

export default function ClientChatScreen() {
  const colors = useColors();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/chat", bookingId],
    queryFn: () => apiFetch<Message[]>(`/chat/${bookingId}/messages`),
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        () => qc.invalidateQueries({ queryKey: ["/api/chat", bookingId] })
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [bookingId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !bookingId) return;
    setSending(true);
    setText("");
    try {
      await apiRequest("POST", `/chat/${bookingId}/messages`, { content: trimmed });
      qc.invalidateQueries({ queryKey: ["/api/chat", bookingId] });
    } catch {}
    finally { setSending(false); }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
        <Text style={[s.bubbleText, isMine ? s.textMine : s.textTheirs]}>{item.content}</Text>
        <Text style={[s.bubbleTime, isMine ? s.timeMine : s.timeTheirs]}>
          {new Date(item.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  }, [user?.id, colors]);

  const s = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle="light-content" />

      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.topBarInfo}>
          <Text style={s.topBarTitle}>In-Trip Chat</Text>
          <Text style={s.topBarSub}>Booking #{bookingId?.slice(-8)}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
        />
      )}

      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.dark,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 56 : Platform.OS === "web" ? 72 : 20,
      paddingBottom: 16,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    topBarInfo: { flex: 1 },
    topBarTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
    topBarSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },

    messageList: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "column",
    },

    bubble: {
      maxWidth: "78%",
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 8,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
      alignSelf: "flex-end",
      borderBottomRightRadius: 4,
    },
    bubbleTheirs: {
      backgroundColor: colors.card,
      alignSelf: "flex-start",
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
    textMine: { color: "#FFFFFF" },
    textTheirs: { color: colors.foreground },
    bubbleTime: { fontSize: 11, marginTop: 4 },
    timeMine: { color: "rgba(255,255,255,0.6)", textAlign: "right" },
    timeTheirs: { color: colors.mutedForeground },

    empty: { alignItems: "center", paddingTop: 40 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 16,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      maxHeight: 100,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
}
