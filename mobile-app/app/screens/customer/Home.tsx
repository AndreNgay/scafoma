import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../libs/apiCall";
import useStore from "../../store";

// Import GCash icon
const GCashIcon = require("../../../assets/images/gcash-icon.png");

const { width } = Dimensions.get("window");

const Home = ({ navigation }: any) => {
  const user = useStore((s: any) => s.user);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [featuredConcessions, setFeaturedConcessions] = useState<any[]>([]);
  const [trendingDishes, setTrendingDishes] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, favoriteCategory: "", totalSpent: 0 });
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load concessions (featured/top-rated placeholder)
      const conRes = await api.get("/concession/all");
      const concessions = conRes.data.data || [];
      // Randomize to avoid burying less popular concessions
      const shuffled = [...concessions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setFeaturedConcessions(shuffled.slice(0, 10));

      // Load menu items, derive categories
      const miRes = await api.get("/menu-item/all", { params: { sortBy: "name", limit: 100 } });
      const items = miRes.data.data || [];
      const uniqueCategories = Array.from(
        new Set((items as any[]).map((i: any) => (i.category ? String(i.category) : "")).filter((c: string) => !!c))
      ) as string[];
      setCategories(uniqueCategories as string[]);

      // Trending dishes (this week)
      const trendRes = await api.get("/order-detail/analytics/trending-week", { params: { limit: 10 } });
      setTrendingDishes(trendRes.data.data || trendRes.data || []);

      // Load user-specific data
      if (user?.id) {
        try {
          // Active orders
          const activeRes = await api.get(`/order/customer/${user.id}?segment=active`);
          setActiveOrders(activeRes.data.data || []);

          // Personalized recommendations
          const recentRes = await api.get(`/order-detail/analytics/recent/${user.id}`, { params: { limit: 10 } });
          const recs = recentRes.data.data || recentRes.data || [];
          setRecommendations(recs);

          // User statistics
          try {
            const allOrdersRes = await api.get(`/order/customer/${user.id}`);
            const allOrders = allOrdersRes.data.data || [];
            const totalOrders = allOrders.length;
            
            // Calculate total spent from completed orders only
            const completedOrders = allOrders.filter((order: any) => 
              order.order_status === 'completed');
            const totalSpent = completedOrders.reduce((sum: number, order: any) => 
              sum + Number(order.updated_total_price || order.total_price || 0), 0);
            
            // Find favorite category from completed order history
            const categoryCount: { [key: string]: number } = {};
            completedOrders.forEach((order: any) => {
              if (order.items) {
                order.items.forEach((item: any) => {
                  if (item.category) {
                    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
                  }
                });
              }
            });
            
            const favoriteCategory = Object.keys(categoryCount).reduce((a, b) => 
              categoryCount[a] > categoryCount[b] ? a : b, "");

            setStats({ totalOrders, favoriteCategory, totalSpent });
          } catch {
            setStats({ totalOrders: 0, favoriteCategory: "", totalSpent: 0 });
          }
        } catch {
          setRecommendations([]);
          setActiveOrders([]);
          setStats({ totalOrders: 0, favoriteCategory: "", totalSpent: 0 });
        }
      } else {
        setRecommendations([]);
        setActiveOrders([]);
        setStats({ totalOrders: 0, favoriteCategory: "", totalSpent: 0 });
      }
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
      setLastLoadTime(Date.now());
      setIsInitialized(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    const shouldLoadData = () => {
      // Always load on first initialization
      if (!isInitialized) {
        return true;
      }
      
      // Load if user ID changed
      if (user?.id && !lastLoadTime) {
        return true;
      }
      
      // Load if data is older than 5 minutes (300000 ms)
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - lastLoadTime > fiveMinutes) {
        return true;
      }
      
      return false;
    };

    if (shouldLoadData()) {
      loadData();
    }
  }, [user?.id, isInitialized, lastLoadTime]);

  // Refresh active orders when screen comes into focus (but not other data)
  useFocusEffect(
    React.useCallback(() => {
      const refreshActiveOrders = async () => {
        if (user?.id && isInitialized) {
          try {
            const activeRes = await api.get(`/order/customer/${user.id}?segment=active`);
            setActiveOrders(activeRes.data.data || []);
          } catch (error) {
            // Silently handle error
          }
        }
      };

      refreshActiveOrders();
    }, [user?.id, isInitialized])
  );

  const getGreeting = () => {
    return "Hello";
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f59e0b";
      case "accepted": return "#3b82f6";
      case "ready for pickup": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return "time-outline";
      case "accepted": return "checkmark-circle-outline";
      case "ready for pickup": return "bag-check-outline";
      default: return "help-circle-outline";
    }
  };


  const ConcessionCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.concessionCard}
      onPress={() =>
        navigation.navigate("Menu Items", {
          screen: "View Concession",
          params: { concession: item },
        })
      }
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.concessionImage} />
      ) : (
        <View style={[styles.concessionImage, styles.imagePlaceholder]}>
          <Ionicons name="storefront-outline" size={32} color="#9ca3af" />
        </View>
      )}
      <View style={styles.concessionInfo}>
        <Text style={styles.concessionName} numberOfLines={1}>{item.concession_name}</Text>
        <Text style={styles.concessionLocation} numberOfLines={1}>📍 {item.cafeteria_name}</Text>
        <View style={styles.paymentMethods}>
          {item.gcash_payment_available && (
            <View style={styles.paymentBadge}>
              <View style={styles.paymentBadgeContent}>
                <Image source={GCashIcon} style={styles.paymentIcon} />
                <Text style={styles.paymentBadgeText}>GCash</Text>
              </View>
            </View>
          )}
          {item.oncounter_payment_available && (
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentBadgeText}>💰 Counter</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const calculateDisplayPrice = (item: any) => {
    const basePrice = Number(item.price) || 0;
    
    // If no variations, return base price
    if (!item.variations || item.variations.length === 0) {
      return basePrice;
    }

    // Group variations by group name
    const variationGroups: { [key: string]: any[] } = {};
    item.variations.forEach((variation: any) => {
      const groupName = variation.variation_group_name;
      if (!variationGroups[groupName]) {
        variationGroups[groupName] = [];
      }
      variationGroups[groupName].push(variation);
    });

    // Calculate minimum required additional cost
    let minimumAdditionalCost = 0;
    
    Object.values(variationGroups).forEach((group: any[]) => {
      if (group.length === 0) return;
      
      const minSelection = group[0].min_selection || 0;
      
      // If this group requires at least one selection (min_selection >= 1)
      if (minSelection >= 1) {
        // Sort variations in this group by additional_price to find cheapest options
        const sortedByPrice = group.sort((a, b) => 
          Number(a.additional_price) - Number(b.additional_price)
        );
        
        // Add the cost of the minimum required selections (cheapest options)
        for (let i = 0; i < minSelection && i < sortedByPrice.length; i++) {
          minimumAdditionalCost += Number(sortedByPrice[i].additional_price) || 0;
        }
      }
    });

    return basePrice + minimumAdditionalCost;
  };

  const formatPriceDisplay = (item: any) => {
    const basePrice = Number(item.price) || 0;
    const displayPrice = calculateDisplayPrice(item);
    
    // If no variations, show exact price
    if (!item.variations || item.variations.length === 0) {
      return `₱${basePrice.toFixed(2)}`;
    }
    
    // If item has variations, always show + to indicate more options available
    return `₱${displayPrice.toFixed(2)}+`;
  };

  const DishCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.dishCard}
      onPress={() =>
        navigation.navigate("Menu Items", {
          screen: "Menu Item Details",
          params: { item },
        })
      }
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.dishImage} />
      ) : (
        <View style={[styles.dishImage, styles.imagePlaceholder]}>
          <Ionicons name="fast-food-outline" size={28} color="#9ca3af" />
        </View>
      )}
      <View style={styles.dishInfo}>
        <Text style={styles.dishName} numberOfLines={2}>{item.item_name}</Text>
        <Text style={styles.dishLocation} numberOfLines={1}>
          {item.concession_name}
        </Text>
        <Text style={styles.dishPrice}>{formatPriceDisplay(item)}</Text>
      </View>
    </TouchableOpacity>
  );

  const ActiveOrderCard = ({ order }: { order: any }) => (
    <TouchableOpacity 
      style={styles.activeOrderCard}
      onPress={() => {
        navigation.reset({
          index: 1,
          routes: [
            { name: "Home" },
            { 
              name: "Orders", 
              state: {
                routes: [
                  { name: "Customer Orders" },
                  { 
                    name: "View Order Customer", 
                    params: { orderId: order.id }
                  }
                ],
                index: 1
              }
            }
          ]
        });
      }}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order #{order.id}</Text>
        <View style={[styles.orderStatus, { backgroundColor: getOrderStatusColor(order.order_status) }]}>
          <Ionicons name={getOrderStatusIcon(order.order_status)} size={12} color="#fff" />
          <Text style={styles.orderStatusText}>{order.order_status}</Text>
        </View>
      </View>
      <Text style={styles.orderConcession}>{order.concession_name}</Text>
      <Text style={styles.orderTotal}>₱{Number(order.updated_total_price || order.total_price).toFixed(2)}</Text>
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
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#A40C2D"
        />
      }
    >
      {/* Header with Greeting */}
      <View style={styles.header}>
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.first_name || "Guest"}! 👋</Text>
        </View>
        
        {/* User Stats */}
        {stats.totalOrders > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>₱{stats.totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
            {stats.favoriteCategory && (
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.favoriteCategory}</Text>
                <Text style={styles.statLabel}>Favorite</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <View style={[styles.section, styles.firstSection]}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Active Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Orders", { screen: "Customer Orders" })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={activeOrders.slice(0, 3)}
            keyExtractor={(order) => String(order.id)}
            renderItem={({ item }) => <ActiveOrderCard order={item} />}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Featured Concessions */}
      {featuredConcessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Featured Concessions</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featuredConcessions.slice(0, 8)}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <ConcessionCard item={item} />}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Trending this week */}
      {trendingDishes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Trending This Week</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={trendingDishes.slice(0, 8)}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <DishCard item={item} />}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Personalized recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Just for You</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recommendations.slice(0, 8)}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <DishCard item={item} />}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#A40C2D",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 40,
  },
  firstSection: {
    marginTop: 24,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  seeAllText: {
    fontSize: 14,
    color: "#A40C2D",
    fontWeight: "600",
  },
  horizontalList: {
    paddingLeft: 16,
    paddingRight: 40,
    paddingBottom: 16,
  },
  concessionCard: {
    width: width * 0.75,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  concessionImage: {
    width: "100%",
    height: 140,
  },
  concessionInfo: {
    padding: 16,
    minHeight: 90,
    paddingBottom: 20,
  },
  concessionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  concessionLocation: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  paymentBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  paymentBadgeText: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "500",
  },
  paymentBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  dishCard: {
    width: width * 0.45,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dishImage: {
    width: "100%",
    height: 120,
  },
  dishInfo: {
    padding: 16,
    minHeight: 80,
    paddingBottom: 20,
  },
  dishName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  dishLocation: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 6,
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A40C2D",
  },
  imagePlaceholder: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  activeOrderCard: {
    width: width * 0.65,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    paddingBottom: 20,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  orderStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "capitalize",
  },
  orderConcession: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#A40C2D",
  },
  bottomSpacing: {
    height: 40,
  },
});


