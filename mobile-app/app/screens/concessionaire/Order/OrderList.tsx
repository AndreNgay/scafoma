import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api from "../../../libs/apiCall";
import useStore from "../../../store";

interface Order {
  id: number;
  order_status: string;
  total_price: number;
  created_at: string;
  first_name: string;
  last_name: string;
  concession_name: string;
  profile_image?: string | null;
  customer_id: number;
}

const PAGE_SIZE = 10;

const OrderList = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false); // general loading
  const [initialLoading, setInitialLoading] = useState(true); // first load
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const user = useStore((state: any) => state.user);

  const fetchOrders = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (!refresh && pageNum > 1) {
        setLoading(true); // show footer loader
      }
      if (pageNum === 1 && !refresh) {
        setInitialLoading(true); // full screen loader
      }

      setError(null);

      const res = await api.get(
        `/order/concessionare/${user.id}?page=${pageNum}&limit=${PAGE_SIZE}`
      );
      const { data: newOrders, totalPages } = res.data;

      if (refresh || pageNum === 1) {
        setOrders(newOrders);
      } else {
        // Use functional update to avoid stale closure
        setOrders((prev) => [...prev, ...newOrders]);
      }

      setHasMore(pageNum < totalPages);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (refresh) setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setStatusFilter([]); // Show all by default
      fetchOrders(1, true);
    }, [fetchOrders])
  );

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchOrders(1, true);
  };

  // Load more on scroll
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prevPage) => {
        const nextPage = prevPage + 1;
        fetchOrders(nextPage);
        return nextPage;
      });
    }
  }, [loading, hasMore, fetchOrders]);

  // Apply search, filter, and sort
  useEffect(() => {
    let filtered = [...orders];

    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.concession_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.id.toString().includes(searchQuery)
      );
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter((o) => statusFilter.includes(o.order_status));
    }

    if (sortBy) {
      switch (sortBy) {
        case "date_desc":
          filtered.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          break;
        case "date_asc":
          filtered.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          break;
        case "price_asc":
          filtered.sort((a, b) => a.total_price - b.total_price);
          break;
        case "price_desc":
          filtered.sort((a, b) => b.total_price - a.total_price);
          break;
      }
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, sortBy, orders]);

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("View Order", { orderId: item.id })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("View Customer Profile", { customerId: item.customer_id });
          }}
        >
          {item.profile_image ? (
            <Image
              source={{ uri: item.profile_image }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {item.first_name?.[0]}{item.last_name?.[0]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <Text style={styles.customer}>
            Customer: {item.first_name} {item.last_name}
          </Text>
          <Text>
            Status: <Text style={styles.status}>{item.order_status}</Text>
          </Text>
          {item.order_status === 'declined' && (item as any).decline_reason ? (
            <Text style={styles.declineReason}>Reason: {(item as any).decline_reason}</Text>
          ) : null}
          <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
          <Text>Date: {new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Group orders by status when no explicit status filter is applied
  const groupedSections = (() => {
    if (statusFilter.length > 0) return [] as { title: string; data: Order[] }[];
    const groups: Record<string, Order[]> = {};
    for (const o of filteredOrders) {
      const key = (o.order_status || 'unknown').toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    }
    const orderStatusPriority = [
      'pending',
      'accepted',
      'ready for pickup',
      'completed',
      'declined',
      'cancelled',
    ];
    const toLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const keys = Object.keys(groups).sort((a, b) => {
      const ai = orderStatusPriority.indexOf(a);
      const bi = orderStatusPriority.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return keys.map((k) => ({ title: toLabel(k), data: groups[k] }));
  })();

  // full-screen loader
  if (initialLoading) {
    return (
      <View style={styles.fullLoader}>
        <ActivityIndicator size="large" color="#A40C2D" />
        <Text style={{ marginTop: 10, color: "#A40C2D" }}>Loading orders...</Text>
      </View>
    );
  }

  if (error)
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by customer, concession, or ID..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => setFiltersVisible(true)}
      >
        <Text style={styles.filterText}>Filters & Sort</Text>
      </TouchableOpacity>

      {!orders.length ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      ) : (
        statusFilter.length > 0 ? (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrder}
            contentContainerStyle={{ paddingBottom: 20 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={
              loading && page > 1 ? (
                <ActivityIndicator
                  size="small"
                  color="#A40C2D"
                  style={{ marginVertical: 10 }}
                />
              ) : null
            }
          />
        ) : (
          <SectionList
            sections={groupedSections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrder}
            contentContainerStyle={{ paddingBottom: 20 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            ListFooterComponent={
              loading && page > 1 ? (
                <ActivityIndicator
                  size="small"
                  color="#A40C2D"
                  style={{ marginVertical: 10 }}
                />
              ) : null
            }
          />
        )
      )}

      <Modal visible={filtersVisible} animationType="slide">
        <View style={styles.filterContainer}>
          <View style={styles.filterHeaderContainer}>
            <Text style={styles.filterHeader}>Filter Orders</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFiltersVisible(false)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Status (Select Multiple)</Text>
          {[
            "pending",
            "accepted",
            "ready-for-pickup",
            "completed",
            "declined",
          ].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => {
                if (statusFilter.includes(status)) {
                  setStatusFilter(statusFilter.filter(s => s !== status));
                } else {
                  setStatusFilter([...statusFilter, status]);
                }
              }}
            >
              <Text
                style={
                  statusFilter.includes(status) ? styles.active : styles.option
                }
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.label}>Sort by</Text>
          {[
            { key: "date_desc", label: "Date (Newest → Oldest)" },
            { key: "date_asc", label: "Date (Oldest → Newest)" },
            { key: "price_asc", label: "Total Price (Low → High)" },
            { key: "price_desc", label: "Total Price (High → Low)" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() =>
                setSortBy(sortBy === opt.key ? null : opt.key)
              }
            >
              <Text
                style={sortBy === opt.key ? styles.active : styles.option}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setStatusFilter([])}
            >
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setFiltersVisible(false)}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  filterBtn: {
    padding: 10,
    backgroundColor: "#A40C2D",
    marginBottom: 15,
    borderRadius: 8,
  },
  filterText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  orderCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  orderId: { fontWeight: "bold", fontSize: 16, color: "#A40C2D" },
  customer: { fontSize: 14, marginTop: 4 },
  status: { fontWeight: "600", color: "#A40C2D" },
  declineReason: { color: "#dc3545", fontSize: 12, fontStyle: "italic", marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  emptyText: { textAlign: "center", color: "#888", fontSize: 16 },
  errorText: { textAlign: "center", color: "red", marginTop: 20 },
  filterContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  filterHeaderContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  filterHeader: { fontSize: 18, fontWeight: "bold" },
  sectionHeader: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#A40C2D",
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A40C2D",
    textTransform: "capitalize",
  },
  closeBtn: {
    backgroundColor: "#ccc",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  label: { marginTop: 15, fontWeight: "600" },
  option: { padding: 8, fontSize: 14 },
  active: {
    padding: 8,
    fontSize: 14,
    backgroundColor: "#A40C2D",
    color: "#fff",
    borderRadius: 6,
  },
  buttonRow: { 
    flexDirection: "row", 
    marginTop: 20, 
    gap: 10 
  },
  clearBtn: {
    flex: 1,
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 8,
  },
  clearText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  applyBtn: {
    flex: 1,
    backgroundColor: "#A40C2D",
    padding: 12,
    borderRadius: 8,
  },
  applyText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#A40C2D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  fullLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default OrderList;
