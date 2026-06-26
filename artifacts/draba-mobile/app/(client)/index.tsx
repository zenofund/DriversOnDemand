import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import { useBookingStore } from "@/store/bookingStore";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  hourly_rate: number;
  rating: number;
  total_trips: number;
  profile_picture_url: string | null;
  vehicle_type?: string;
  distance_km?: number;
}

export default function ClientBookScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const { setPickupLocation, setDestination, setSelectedDriver } = useBookingStore();

  const [pickup, setPickup] = useState("");
  const [dest, setDest] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [locating, setLocating] = useState(false);

  const { data: drivers = [], isLoading, refetch } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/nearby", userCoords?.lat, userCoords?.lng],
    queryFn: () =>
      apiFetch<Driver[]>(
        `/drivers/nearby?lat=${userCoords!.lat}&lng=${userCoords!.lng}`
      ),
    enabled: searchTriggered && !!userCoords,
  });

  const handleLocate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is needed to find nearby drivers.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      // Reverse geocode for pickup label
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
    if (!userCoords) {
      Alert.alert("Location needed", "Please use the GPS button to set your location.");
      return;
    }
    setPickupLocation(pickup);
    setDestination(dest);
    setSearchTriggered(true);
    refetch();
  };

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver.id, driver as any);
    router.push("/(client)/booking-confirm");
  };

  const styles = makeStyles(colors);

  const renderDriver = ({ item }: { item: Driver }) => (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() => handleSelectDriver(item)}
      activeOpacity={0.75}
    >
      <View style={styles.driverAvatar}>
        <Text style={styles.driverInitial}>
          {item.full_name?.charAt(0)?.toUpperCase() ?? "D"}
        </Text>
      </View>
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{item.full_name}</Text>
        <View style={styles.driverMeta}>
          <Feather name="star" size={13} color={colors.warning} />
          <Text style={styles.driverRating}>
            {item.rating?.toFixed(1) ?? "5.0"}
          </Text>
          <Text style={styles.driverDot}>·</Text>
          <Text style={styles.driverTrips}>{item.total_trips ?? 0} trips</Text>
          {item.vehicle_type ? (
            <>
              <Text style={styles.driverDot}>·</Text>
              <Text style={styles.driverTrips}>{item.vehicle_type}</Text>
            </>
          ) : null}
        </View>
        {item.distance_km != null && (
          <Text style={styles.driverDistance}>
            {item.distance_km < 1
              ? `${Math.round(item.distance_km * 1000)} m away`
              : `${item.distance_km.toFixed(1)} km away`}
          </Text>
        )}
      </View>
      <View style={styles.driverRate}>
        <Text style={styles.rateAmount}>₦{(item.hourly_rate ?? 0).toLocaleString()}</Text>
        <Text style={styles.rateLabel}>/hr</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
      <View style={styles.searchBox}>
        <View style={styles.inputRow}>
          <View style={styles.dot} />
          <TextInput
            style={styles.input}
            value={pickup}
            onChangeText={setPickup}
            placeholder="Pickup location"
            placeholderTextColor={colors.mutedForeground}
          />
          <TouchableOpacity onPress={handleLocate} style={styles.gpsBtn} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="crosshair" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <View style={[styles.dot, styles.dotDest]} />
          <TextInput
            style={styles.input}
            value={dest}
            onChangeText={setDest}
            placeholder="Where to?"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Feather name="search" size={16} color={colors.primaryForeground} />
          <Text style={styles.searchBtnText}>Find Drivers</Text>
        </TouchableOpacity>
      </View>

      {isLoading && searchTriggered ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding nearby drivers…</Text>
        </View>
      ) : searchTriggered && drivers.length === 0 ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No drivers nearby</Text>
          <Text style={styles.emptySubtitle}>Try again later or expand your search area.</Text>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          renderItem={renderDriver}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) },
          ]}
          ListHeaderComponent={
            drivers.length > 0 ? (
              <Text style={styles.listHeader}>
                {drivers.length} driver{drivers.length !== 1 ? "s" : ""} available
              </Text>
            ) : null
          }
          scrollEnabled={!!drivers.length}
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBox: {
      margin: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    dotDest: {
      backgroundColor: colors.destructive,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      paddingVertical: 8,
    },
    gpsBtn: { padding: 4 },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 6,
      marginLeft: 20,
    },
    searchBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      gap: 8,
      marginTop: 12,
    },
    searchBtnText: {
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    loadingText: {
      marginTop: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    emptyTitle: {
      marginTop: 12,
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySubtitle: {
      marginTop: 6,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    listHeader: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      paddingHorizontal: 16,
      paddingBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    list: { paddingTop: 4 },
    driverCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    driverAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    driverInitial: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    driverInfo: { flex: 1 },
    driverName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    driverMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    driverRating: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    driverDot: { color: colors.mutedForeground, fontSize: 13 },
    driverTrips: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    driverDistance: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 3,
    },
    driverRate: { alignItems: "flex-end" },
    rateAmount: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primary },
    rateLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
