import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useColors } from "@/hooks/useColors";

interface Review {
  id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: {
    full_name: string;
  };
  booking?: {
    pickup_location: string;
    destination: string;
  };
}

export default function DriverReviewsScreen() {
  const colors = useColors();

  const { data: reviews = [], isLoading, refetch, isRefetching } = useQuery<Review[]>({
    queryKey: ["/api/drivers/me/reviews"],
    queryFn: () => apiFetch<Review[]>("/drivers/me/reviews"),
  });

  const s = makeStyles(colors);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
      : null;

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));
  const maxCount = Math.max(1, ...dist.map((d) => d.count));

  const renderStars = (rating: number) =>
    [1, 2, 3, 4, 5].map((i) => (
      <Feather
        key={i}
        name="star"
        size={14}
        color={i <= Math.round(rating) ? colors.accent : colors.border}
      />
    ));

  const renderReview = ({ item, index }: { item: Review; index: number }) => (
    <View style={[s.reviewRow, index < reviews.length - 1 && s.reviewBorder]}>
      <View style={s.reviewAvatar}>
        <Text style={s.reviewAvatarText}>
          {item.reviewer?.full_name?.charAt(0)?.toUpperCase() ?? "C"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.reviewTop}>
          <Text style={s.reviewerName}>{item.reviewer?.full_name ?? "Client"}</Text>
          <View style={s.starsRow}>{renderStars(item.rating ?? 0)}</View>
        </View>
        {item.booking && (
          <Text style={s.tripText} numberOfLines={1}>
            {item.booking.pickup_location} → {item.booking.destination}
          </Text>
        )}
        {item.comment ? (
          <Text style={s.commentText}>"{item.comment}"</Text>
        ) : null}
        <Text style={s.dateText}>
          {new Date(item.created_at).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      style={s.container}
      data={reviews}
      keyExtractor={(r) => r.id}
      renderItem={renderReview}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <>
          <View style={s.topBar}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={s.pageTitle}>My Reviews</Text>
          </View>

          {reviews.length > 0 && (
            <View style={s.summarySection}>
              <View style={s.summaryLeft}>
                <Text style={s.summaryScore}>{avgRating?.toFixed(1) ?? "—"}</Text>
                <View style={s.summaryStars}>
                  {avgRating != null ? renderStars(avgRating) : null}
                </View>
                <Text style={s.summaryCount}>
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={s.summaryBars}>
                {dist.map(({ star, count }) => (
                  <View key={star} style={s.barRow}>
                    <Text style={s.barLabel}>{star}</Text>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          { width: `${(count / maxCount) * 100}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={s.barCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {reviews.length > 0 && (
            <Text style={s.sectionLabel}>All Reviews</Text>
          )}
        </>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={s.empty}>
            <Feather name="star" size={44} color={colors.border} />
            <Text style={s.emptyTitle}>No reviews yet</Text>
            <Text style={s.emptySub}>
              Clients will leave reviews after completed trips.
            </Text>
          </View>
        ) : (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )
      }
      contentContainerStyle={{
        paddingBottom: 60,
        flexGrow: reviews.length === 0 ? 1 : undefined,
      }}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "ios" ? 60 : Platform.OS === "web" ? 24 : 20,
      paddingBottom: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },

    summarySection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 20,
      marginBottom: 8,
    },
    summaryLeft: { alignItems: "center", minWidth: 80 },
    summaryScore: { fontSize: 48, fontFamily: "Inter_700Bold", color: colors.foreground, lineHeight: 56 },
    summaryStars: { flexDirection: "row", gap: 3, marginTop: 6 },
    summaryCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 6 },
    summaryBars: { flex: 1, gap: 5 },
    barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    barLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, width: 10 },
    barTrack: { flex: 1, height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" },
    barFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 3 },
    barCount: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", width: 18, textAlign: "right" },

    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },

    reviewRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    reviewBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    reviewAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    reviewAvatarText: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.primary },
    reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    reviewerName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    starsRow: { flexDirection: "row", gap: 2 },
    tripText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 6 },
    commentText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      fontStyle: "italic",
      lineHeight: 20,
      marginBottom: 6,
    },
    dateText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      paddingTop: 60,
      gap: 12,
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
}
