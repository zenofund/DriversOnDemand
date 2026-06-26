import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#7A6200" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (role === "client") return <Redirect href="/(client)/" />;
  if (role === "driver") return <Redirect href="/(driver)/" />;

  return <Redirect href="/(auth)/login" />;
}
