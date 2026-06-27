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
    role: "driver" | "client";
  };
  booking?: {
    pickup_location: string;
    destination: string;
  };
}

export default function ClientReviewsScreen() {
  const colors = useColors();

  const { data: reviews = [], isLoading, refetch, isRefetching } = useQuery<Review[]>({
    queryKey: ["/api/clients/me/reviews"],
    queryFn: () => apiFetch<Review[]>("/clients/me/reviews"),
  });

  const s = makeStyles(colors);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
      : null;

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
          {item.reviewer?.full_name?.charAt(0)?.toUpperCase() ?? "D"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.reviewTop}>
          <Text style={s.reviewerName}>{item.reviewer?.full_name ?? "Driver"}</Text>
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
            <View style={s.summaryCard}>
              <Text style={s.summaryScore}>{avgRating?.toFixed(1) ?? "—"}</Text>
              <View style={s.summaryStars}>
                {avgRating != null ? renderStars(avgRating) : null}
              </View>
              <Text style={s.summaryCount}>
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </Text>
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
              Reviews from drivers will appear here after completed trips.
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

    summaryCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 24,
      marginBottom: 8,
    },
    summaryScore: { fontSize: 52, fontFamily: "Inter_700Bold", color: colors.foreground, lineHeight: 60 },
    summaryStars: { flexDirection: "row", gap: 4, marginTop: 6 },
    summaryCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 8 },

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
