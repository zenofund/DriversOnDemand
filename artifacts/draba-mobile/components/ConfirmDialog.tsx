import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
  onDismiss,
}: Props) {
  const colors = useColors();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
          {message ? (
            <Text style={[s.message, { color: colors.mutedForeground }]}>
              {message}
            </Text>
          ) : null}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, s.cancelBtn, { borderColor: colors.border }]}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={[s.btnText, { color: colors.foreground }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.btn,
                s.confirmBtn,
                {
                  backgroundColor: destructive
                    ? colors.destructive
                    : colors.primary,
                },
              ]}
              onPress={() => {
                onDismiss();
                onConfirm();
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.btnText, { color: "#FFFFFF" }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    borderRadius: 5,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {},
  btnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
