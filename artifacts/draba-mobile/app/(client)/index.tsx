import React, { useState, useCallback, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useAuthStore, type ClientProfile } from "@/store/authStore";
import { useBookingStore } from "@/store/bookingStore";
import { useColors } from "@/hooks/useColors";

// Lazy-load react-native-maps only on native to avoid web bundler issues
const isNative = Platform.OS !== "web";
const MapView = isNative ? require("react-native-maps").default : null;
const Marker = isNative ? require("react-native-maps").Marker : null;
const Circle = isNative ? require("react-native-maps").Circle : null;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_HEIGHT = 320;

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
  latitude?: number;
  longitude?: number;
}

interface DriverWithCoords extends Driver {
  _mapLat: number;
  _mapLng: number;
}

/** Place a driver on the map based on their distance from the client. */
function assignDriverCoords(
  driver: Driver,
  clientLat: number,
  clientLng: number,
  seed: number
): { lat: number; lng: number } {
  if (driver.latitude && driver.longitude) {
    return { lat: driver.latitude, lng: driver.longitude };
  }
  const dist = driver.distance_km ?? 0.5 + Math.random() * 2.5;
  const angle = seed * 2.399963; // golden angle spacing for even distribution
  const latOffset = (dist * Math.cos(angle)) / 111.32;
  const lngOffset =
    (dist * Math.sin(angle)) /
    (111.32 * Math.cos((clientLat * Math.PI) / 180));
  return { lat: clientLat + latOffset, lng: clientLng + lngOffset };
}

export default function ClientHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { profile } = useAuthStore();
  const clientProfile = profile as ClientProfile | null;
  const { setPickupLocation, setDestination, setSelectedDriver } = useBookingStore();

  const [pickup, setPickupText] = useState("");
  const [dest, setDestText] = useState("");
  const [locating, setLocating] = useState(false);
  const [clientCoords, setClientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedDriver, setSelectedDriverLocal] = useState<DriverWithCoords | null>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const firstName = clientProfile?.full_name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { data: rawDrivers = [], isLoading, refetch, isRefetching } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/nearby", clientCoords?.lat, clientCoords?.lng],
    queryFn: () =>
      clientCoords
        ? apiFetch<Driver[]>(`/drivers/nearby?lat=${clientCoords.lat}&lng=${clientCoords.lng}`)
        : apiFetch<Driver[]>("/drivers/available"),
    enabled: searched || !clientCoords,
  });

  // Attach map coordinates to each driver
  const drivers: DriverWithCoords[] = clientCoords
    ? rawDrivers.map((d, i) => {
        const { lat, lng } = assignDriverCoords(d, clientCoords.lat, clientCoords.lng, i + 1);
        return { ...d, _mapLat: lat, _mapLng: lng };
      })
    : [];

  const handleLocate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is needed to find nearby drivers.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setClientCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      if (place) {
        const label = [place.street, place.district, place.city].filter(Boolean).join(", ");
        setPickupText(label || "Current Location");
      } else {
        setPickupText("Current Location");
      }
    } catch {
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLocating(false);
    }
  };

  const handleSearch = useCallback(async () => {
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
    if (!clientCoords) {
      await handleLocate();
    }
    setSearched(true);
    refetch();
  }, [pickup, dest, clientCoords]);

  const openDriverSheet = useCallback((driver: DriverWithCoords) => {
    setSelectedDriverLocal(driver);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [sheetAnim]);

  const closeDriverSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSelectedDriverLocal(null));
  }, [sheetAnim]);

  const handleBookDriver = useCallback(() => {
    if (!selectedDriver) return;
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
    setSelectedDriver(selectedDriver.id, selectedDriver as any);
    closeDriverSheet();
    router.push("/(client)/booking-confirm");
  }, [selectedDriver, pickup, dest, clientProfile]);

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BOTTOM_SHEET_HEIGHT + tabBarHeight + 40, 0],
  });

  // ─── NATIVE MAP UI ────────────────────────────────────────────────
  if (isNative && MapView) {
    const mapRegion = clientCoords
      ? {
          latitude: clientCoords.lat,
          longitude: clientCoords.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : {
          latitude: 6.5244, // Lagos default
          longitude: 3.3792,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };

    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        {/* Full-screen map */}
        <MapView
          style={StyleSheet.absoluteFill}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {drivers.map((driver) => (
            <Marker
              key={driver.id}
              coordinate={{ latitude: driver._mapLat, longitude: driver._mapLng }}
              onPress={() => openDriverSheet(driver)}
            >
              <View style={nativeS.markerOuter}>
                <View style={nativeS.markerInner}>
                  <Text style={nativeS.markerText}>
                    {driver.full_name?.charAt(0)?.toUpperCase() ?? "D"}
                  </Text>
                </View>
                <View style={nativeS.markerTail} />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Search overlay (top) */}
        <View style={[nativeS.searchOverlay, { paddingTop: insets.top + 12 }]}>
          <View style={nativeS.searchCard}>
            {/* Greeting row */}
            <View style={nativeS.greetingRow}>
              <Text style={nativeS.greetingText}>
                {greeting}, {firstName}
              </Text>
              {!clientProfile?.nin_verified && (
                <TouchableOpacity
                  style={nativeS.verifyBadge}
                  onPress={() => router.push("/(client)/verify-nin")}
                >
                  <Feather name="shield" size={12} color="#D97706" />
                  <Text style={nativeS.verifyText}>Verify ID</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Pickup row */}
            <View style={nativeS.inputRow}>
              <View style={[nativeS.locDot, { backgroundColor: "#7A6200" }]} />
              <TextInput
                style={nativeS.locationInput}
                value={pickup}
                onChangeText={setPickupText}
                placeholder="Pickup location"
                placeholderTextColor="#8A8FA8"
                returnKeyType="next"
              />
              <TouchableOpacity style={nativeS.gpsBtn} onPress={handleLocate} disabled={locating}>
                {locating ? (
                  <ActivityIndicator size="small" color="#7A6200" />
                ) : (
                  <Feather name="crosshair" size={16} color="#7A6200" />
                )}
              </TouchableOpacity>
            </View>

            <View style={nativeS.inputDivider} />

            {/* Destination row */}
            <View style={nativeS.inputRow}>
              <View style={[nativeS.locDot, { backgroundColor: "#BF1010" }]} />
              <TextInput
                style={nativeS.locationInput}
                value={dest}
                onChangeText={setDestText}
                placeholder="Where to?"
                placeholderTextColor="#8A8FA8"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {dest.length > 0 && (
                <TouchableOpacity onPress={() => setDestText("")}>
                  <Feather name="x" size={15} color="#8A8FA8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Find button */}
            <TouchableOpacity
              style={nativeS.findBtn}
              onPress={handleSearch}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="search" size={15} color="#FFFFFF" />
                  <Text style={nativeS.findBtnText}>
                    {searched ? `${drivers.length} drivers found — search again` : "Find Drivers"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Driver count badge */}
        {searched && !isLoading && (
          <View style={nativeS.driverCountBadge}>
            <Feather name="user" size={12} color="#FFFFFF" />
            <Text style={nativeS.driverCountText}>
              {drivers.length} driver{drivers.length !== 1 ? "s" : ""} nearby
            </Text>
          </View>
        )}

        {/* Driver bottom sheet */}
        {selectedDriver && (
          <Animated.View
            style={[
              nativeS.bottomSheet,
              {
                bottom: tabBarHeight,
                transform: [{ translateY: sheetTranslateY }],
                paddingBottom: 20,
              },
            ]}
          >
            {/* Handle */}
            <View style={nativeS.sheetHandle} />

            <View style={nativeS.sheetContent}>
              {/* Driver info */}
              <View style={nativeS.sheetDriver}>
                <View style={nativeS.sheetAvatar}>
                  <Text style={nativeS.sheetAvatarText}>
                    {selectedDriver.full_name?.charAt(0)?.toUpperCase() ?? "D"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={nativeS.sheetNameRow}>
                    <Text style={nativeS.sheetName}>{selectedDriver.full_name}</Text>
                    {selectedDriver.verified && (
                      <Feather name="check-circle" size={14} color="#16A34A" />
                    )}
                  </View>
                  <View style={nativeS.sheetMeta}>
                    <Feather name="star" size={12} color="#D97706" />
                    <Text style={nativeS.sheetMetaText}>
                      {selectedDriver.rating?.toFixed(1) ?? "5.0"}
                    </Text>
                    <Text style={nativeS.sheetMetaDot}>·</Text>
                    <Text style={nativeS.sheetMetaText}>
                      {selectedDriver.total_trips ?? 0} trips
                    </Text>
                    {selectedDriver.distance_km != null && (
                      <>
                        <Text style={nativeS.sheetMetaDot}>·</Text>
                        <Text style={nativeS.sheetMetaText}>
                          {selectedDriver.distance_km < 1
                            ? `${Math.round(selectedDriver.distance_km * 1000)}m away`
                            : `${selectedDriver.distance_km.toFixed(1)}km away`}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={nativeS.sheetRate}>
                    ₦{(selectedDriver.hourly_rate ?? 0).toLocaleString()}
                  </Text>
                  <Text style={nativeS.sheetRateLabel}>/hr</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={nativeS.sheetActions}>
                <TouchableOpacity style={nativeS.closeBtn} onPress={closeDriverSheet}>
                  <Feather name="x" size={18} color="#545C7E" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={nativeS.bookBtn}
                  onPress={handleBookDriver}
                  activeOpacity={0.85}
                >
                  <Text style={nativeS.bookBtnText}>Book this Driver</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    );
  }

  // ─── WEB / FALLBACK LIST UI ───────────────────────────────────────
  const s = makeWebStyles(colors, insets.top);

  const renderDriver = ({ item, index }: { item: Driver; index: number }) => (
    <TouchableOpacity
      style={[s.driverRow, index === 0 && s.driverRowFirst]}
      activeOpacity={0.7}
      onPress={() => {
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
        setSelectedDriver(item.id, item as any);
        router.push("/(client)/booking-confirm");
      }}
    >
      <View style={s.driverAvatar}>
        <Text style={s.driverAvatarText}>{item.full_name?.charAt(0)?.toUpperCase() ?? "D"}</Text>
      </View>
      <View style={s.driverInfo}>
        <View style={s.driverNameRow}>
          <Text style={s.driverName}>{item.full_name}</Text>
          {item.verified && (
            <Feather
              name="check-circle"
              size={13}
              color={colors.success}
              style={{ marginLeft: 5 }}
            />
          )}
        </View>
        <View style={s.driverMeta}>
          <Feather name="star" size={12} color={colors.warning} />
          <Text style={s.metaText}>{item.rating?.toFixed(1) ?? "5.0"}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaText}>{item.total_trips ?? 0} trips</Text>
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
            onChangeText={setPickupText}
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
            onChangeText={setDestText}
            placeholder="Where to?"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {dest.length > 0 && (
            <TouchableOpacity onPress={() => setDestText("")}>
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
            ? `${rawDrivers.length} driver${rawDrivers.length !== 1 ? "s" : ""} found`
            : "Available drivers near you"}
        </Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rawDrivers}
          keyExtractor={(d) => d.id}
          renderItem={renderDriver}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
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
            flexGrow: rawDrivers.length === 0 ? 1 : undefined,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── NATIVE MAP STYLES ─────────────────────────────────────────────────────
const nativeS = StyleSheet.create({
  searchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  greetingText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1A1E27" },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifyText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#D97706" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  locationInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1A1E27",
    paddingVertical: 11,
  },
  gpsBtn: { padding: 4 },
  inputDivider: {
    height: 1,
    backgroundColor: "#E0E2EE",
    marginLeft: 19,
  },

  findBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7A6200",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  findBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  driverCountBadge: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(13,15,21,0.82)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  driverCountText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  markerOuter: { alignItems: "center" },
  markerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7A6200",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#7A6200",
    marginTop: -1,
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E0E2EE",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetContent: { paddingHorizontal: 20, paddingTop: 12 },
  sheetDriver: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#C4A225",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sheetAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#7A6200" },
  sheetNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  sheetName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#1A1E27" },
  sheetMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  sheetMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#545C7E" },
  sheetMetaDot: { fontSize: 12, color: "#E0E2EE" },
  sheetRate: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1A1E27" },
  sheetRateLabel: { fontSize: 11, color: "#545C7E", fontFamily: "Inter_400Regular" },

  sheetActions: { flexDirection: "row", gap: 10 },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E2EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bookBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7A6200",
    borderRadius: 12,
    paddingVertical: 14,
  },
  bookBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 },
});

// ─── WEB / LIST STYLES ─────────────────────────────────────────────────────
function makeWebStyles(colors: ReturnType<typeof useColors>, topInset: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: topInset + 16,
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
    inputDivider: { height: 1, backgroundColor: colors.border, marginLeft: 14 + 9 + 10 },
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

    listHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
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
    driverMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
      flexWrap: "wrap",
    },
    metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    metaDot: { fontSize: 12, color: colors.border },
    driverRight: { alignItems: "flex-end", flexShrink: 0 },
    driverRate: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    driverRateLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
      gap: 8,
      paddingHorizontal: 32,
    },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
  });
}
