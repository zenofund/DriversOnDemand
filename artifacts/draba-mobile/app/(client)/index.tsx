import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useAuthStore, type ClientProfile } from "@/store/authStore";
import { useBookingStore } from "@/store/bookingStore";
import { useColors } from "@/hooks/useColors";

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  hourly_rate: number;
  rating: number;
  total_trips: number;
  vehicle_type?: string;
  distance_km?: number;
  verified?: boolean;
}

export default function ClientHomeScreen() {
  const colors = useColors();
  const { profile } = useAuthStore();
  const clientProfile = profile as ClientProfile | null;
  const { setPickupLocation, setDestination, setSelectedDriver } = useBookingStore();

  const [pickup, setPickup] = useState("");
  const [dest, setDest] = useState("");
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searched, setSearched] = useState(false);

  const { data: drivers = [], isLoading, refetch, isRefetching } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/nearby", coords?.lat, coords?.lng],
    queryFn: () =>
      coords
        ? apiFetch<Driver[]>(`/drivers/nearby?lat=${coords.lat}&lng=${coords.lng}`)
        : apiFetch<Driver[]>("/drivers/available"),
    enabled: searched || !coords,
  });

  const firstName = clientProfile?.full_name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const handleLocate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is needed to find nearby drivers.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      if (place) {
        const label = [place.street, place.district, place.city].filter(Boolean).join(", ");
        setPickup(label || "Current Location");
      } else {
        setPickup("Current Location");
      }
    } catch {
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLocating(false);
    }
  };

  const handleSearch = () => {
    if (!pickup.trim()) {
      Alert.alert("Missing info", "Enter your pickup location or use GPS.");
      return;
    }
    if (!dest.trim()) {
      Alert.alert("Missing info", "Enter your destination.");
      return;
    }
    setPickupLocation(pickup.trim());
    setDestination(dest.trim());
    setSearched(true);
    refetch();
  };

  const handleSelectDriver = useCallback(
    (driver: Driver) => {
      if (!pickup.trim() || !dest.trim()) {
        Alert.alert("Locations needed", "Please enter pickup and destination first.");
        return;
      }
      if (!clientProfile?.nin_verified) {
        router.push("/(client)/verify-nin");
        return;
      }
      setPickupLocation(pickup.trim());
      setDestination(dest.trim());
      setSelectedDriver(driver.id, driver as any);
      router.push("/(client)/booking-confirm");
    },
    [pickup, dest, clientProfile]
  );

  const s = makeStyles(colors);

  const renderDriver = useCallback(
    ({ item, index }: { item: Driver; index: number }) => (
      <TouchableOpacity
        style={[s.driverRow, index === 0 && s.driverRowFirst]}
        activeOpacity={0.7}
        onPress={() => handleSelectDriver(item)}
      >
        <View style={s.driverAvatar}>
          <Text style={s.driverAvatarText}>
            {item.full_name?.charAt(0)?.toUpperCase() ?? "D"}
          </Text>
        </View>
        <View style={s.driverInfo}>
          <View style={s.driverNameRow}>
            <Text style={s.driverName}>{item.full_name}</Text>
            {item.verified && (
              <Feather name="check-circle" size={13} color={colors.success} style={{ marginLeft: 5 }} />
            )}
          </View>
          <View style={s.driverMeta}>
            <Feather name="star" size={12} color={colors.warning} />
            <Text style={s.metaText}>{item.rating?.toFixed(1) ?? "5.0"}</Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.metaText}>{item.total_trips ?? 0} trips</Text>
            {item.vehicle_type ? (
              <>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.metaText}>{item.vehicle_type}</Text>
              </>
            ) : null}
            {item.distance_km != null && (
              <>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.metaText}>
                  {item.distance_km < 1
                    ? `${Math.round(item.distance_km * 1000)}m`
                    : `${item.distance_km.toFixed(1)}km`}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={s.driverRight}>
          <Text style={s.driverRate}>₦{(item.hourly_rate ?? 0).toLocaleString()}</Text>
          <Text style={s.driverRateLabel}>/hr</Text>
        </View>
      </TouchableOpacity>
    ),
    [colors, handleSelectDriver]
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.name}>{firstName}</Text>
        </View>
        {!clientProfile?.nin_verified && (
          <TouchableOpacity
            style={s.verifyBadge}
            onPress={() => router.push("/(client)/verify-nin")}
          >
            <Feather name="shield" size={13} color={colors.warning} />
            <Text style={s.verifyBadgeText}>Verify ID</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.searchPanel}>
        <View style={s.locationRow}>
          <View style={[s.locDot, { backgroundColor: colors.primary }]} />
          <TextInput
            style={s.locationInput}
            value={pickup}
            onChangeText={setPickup}
            placeholder="Pickup location"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
          <TouchableOpacity style={s.gpsBtn} onPress={handleLocate} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="crosshair" size={17} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
        <View style={s.inputDivider} />
        <View style={s.locationRow}>
          <View style={[s.locDot, { backgroundColor: colors.destructive }]} />
          <TextInput
            style={s.locationInput}
            value={dest}
            onChangeText={setDest}
            placeholder="Where to?"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {dest.length > 0 && (
            <TouchableOpacity onPress={() => setDest("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Feather name="search" size={15} color="#FFFFFF" />
          <Text style={s.searchBtnText}>Find Drivers</Text>
        </TouchableOpacity>
      </View>

      <View style={s.listHeader}>
        <Text style={s.listHeaderText}>
          {isLoading
            ? "Searching…"
            : searched
            ? `${drivers.length} driver${drivers.length !== 1 ? "s" : ""} found`
            : "Available drivers near you"}
        </Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(d) => d.id}
          renderItem={renderDriver}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="map-pin" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No drivers available</Text>
              <Text style={s.emptySub}>Pull to refresh or try again shortly.</Text>
            </View>
          }
          contentContainerStyle={{
            paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
            flexGrow: drivers.length === 0 ? 1 : undefined,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "ios" ? 60 : Platform.OS === "web" ? 76 : 20,
      paddingBottom: 14,
    },
    greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    name: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    verifyBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#FEF3C7",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },
    verifyBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.warning },

    searchPanel: {
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      paddingBottom: 12,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: 10,
    },
    locDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
    locationInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      paddingVertical: 13,
    },
    gpsBtn: { padding: 4 },
    inputDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 14 + 9 + 10,
    },
    searchBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      marginHorizontal: 14,
      marginTop: 10,
    },
    searchBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },

    listHeader: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 6,
    },
    listHeaderText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
      backgroundColor: colors.background,
    },
    driverRowFirst: { borderTopWidth: 0 },
    driverAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    driverAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.primary },
    driverInfo: { flex: 1 },
    driverNameRow: { flexDirection: "row", alignItems: "center" },
    driverName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    driverMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" },
    metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    metaDot: { fontSize: 12, color: colors.border },
    driverRight: { alignItems: "flex-end", flexShrink: 0 },
    driverRate: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    driverRateLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
