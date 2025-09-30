import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import api from "../../libs/apiCall";
import useStore from "../../store";

const { width } = Dimensions.get("window");

const Home = ({ navigation }: any) => {
  const user = useStore((s: any) => s.user);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [featuredConcessions, setFeaturedConcessions] = useState<any[]>([]);
  const [popularDishes, setPopularDishes] = useState<any[]>([]);
  const [trendingDishes, setTrendingDishes] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load concessions (featured/top-rated placeholder)
      const conRes = await api.get("/concession/all");
      const concessions = conRes.data.data || [];
      setFeaturedConcessions(concessions.slice(0, 10));

      // Load menu items, derive categories
      const miRes = await api.get("/menu-item/all", { params: { sortBy: "name", limit: 100 } });
      const items = miRes.data.data || [];
      const uniqueCategories = Array.from(
        new Set((items as any[]).map((i: any) => (i.category ? String(i.category) : "")).filter((c: string) => !!c))
      ) as string[];
      setCategories(uniqueCategories as string[]);

      // Popular dishes (most ordered overall)
      const popRes = await api.get("/order-detail/analytics/most-ordered", { params: { limit: 10 } });
      setPopularDishes(popRes.data.data || popRes.data || []);

      // Trending dishes (this week)
      const trendRes = await api.get("/order-detail/analytics/trending-week", { params: { limit: 10 } });
      setTrendingDishes(trendRes.data.data || trendRes.data || []);

      // Personalized: Top 10 most recently ordered items by current user
      if (user?.id) {
        try {
          const recentRes = await api.get(`/order-detail/analytics/recent/${user.id}`, { params: { limit: 10 } });
          const recs = recentRes.data.data || recentRes.data || [];
          setRecommendations(recs);
        } catch {
          setRecommendations([]);
        }
      } else {
        setRecommendations([]);
      }
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const CategoryChip = ({ label }: { label: string }) => (
    <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate("Menu Items", { screen: "View Menu Items" })}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );

  const ConcessionCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("Menu Items", {
          screen: "View Concession",
          params: { concession: item },
        })
      }
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
      )}
      <Text style={styles.cardTitle}>{item.concession_name}</Text>
      <Text style={styles.cardSub}>{item.cafeteria_name}</Text>
      <View style={styles.payRow}>
        {item.gcash_payment_available ? <Text style={styles.payBadge}>GCash</Text> : null}
        {item.oncounter_payment_available ? <Text style={styles.payBadge}>On-counter</Text> : null}
      </View>
    </TouchableOpacity>
  );

  const DishCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("Menu Items", {
          screen: "Menu Item Details",
          params: { item },
        })
      }
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
      )}
      <Text style={styles.cardTitle}>{item.item_name}</Text>
      <Text style={styles.cardSub}>
        {item.concession_name}{item.cafeteria_name ? ` • ${item.cafeteria_name}` : ""}
      </Text>
      <Text style={styles.cardSub}>₱{Number(item.price).toFixed(2)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Categories carousel */}
      <Text style={styles.sectionHeader}>Popular Categories</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(c) => c}
        renderItem={({ item }) => <CategoryChip label={item} />}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />

      {/* Featured concessions */}
      <Text style={styles.sectionHeader}>Featured Concessions</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={featuredConcessions}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <ConcessionCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />

      {/* Popular dishes */}
      <Text style={styles.sectionHeader}>Popular Dishes</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={popularDishes}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <DishCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />

      {/* Trending this week */}
      <Text style={styles.sectionHeader}>Trending This Week</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={trendingDishes}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <DishCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />

      {/* Personalized recommendations */}
      {recommendations.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Just for You</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recommendations}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <DishCard item={item} />}
            contentContainerStyle={{ paddingHorizontal: 10 }}
          />
        </>
      )}
    </ScrollView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  sectionHeader: { fontSize: 18, fontWeight: "700", marginHorizontal: 12, marginTop: 16, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#A40C2D",
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: { color: "#fff", fontWeight: "600" },
  card: {
    width: width * 0.6,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
    padding: 10,
    elevation: 2,
  },
  cardImage: { width: "100%", height: 120, borderRadius: 10, marginBottom: 8 },
  cardImagePlaceholder: { backgroundColor: "#eee" },
  cardTitle: { fontWeight: "700" },
  cardSub: { color: "#666", marginTop: 2 },
  payRow: { flexDirection: "row", marginTop: 6 },
  payBadge: { backgroundColor: "#eee", color: "#333", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, fontSize: 12 },
});


