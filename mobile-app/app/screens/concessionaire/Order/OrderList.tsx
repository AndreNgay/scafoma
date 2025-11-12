import React, { useEffect, useState, useCallback, useRef } from "react";
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
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
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

  // History pagination
  const [historyPage, setHistoryPage] = useState(0);
  const [historyStarted, setHistoryStarted] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const user = useStore((state: any) => state.user);
  const hasInitialized = useRef(false);

  const fetchOrders = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh || pageNum === 1) setInitialLoading(true);

      setError(null);

      // Initial load/refresh: only fetch active orders, do NOT fetch history yet
      if (refresh || pageNum === 1) {
        const activeRes = await api.get(
          `/order/concessionare/${user.id}?segment=active&limit=${PAGE_SIZE}`
        );
        const freshActive: Order[] = activeRes.data?.data || [];
        setActiveOrders(freshActive);
        setOrders(freshActive);
        setHistoryStarted(false);
        setHistoryPage(0);
        setHasMoreHistory(true);
        return;
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (refresh) setRefreshing(false);
    }
  }, [user?.id]);

  // Only fetch on initial mount, not on every focus
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setStatusFilter([]); // Show all by default
      fetchOrders(1, true);
    }
  }, []); // Empty dependency array - only run once on mount

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(1, true);
  };

  // Load more on scroll
  const loadMore = useCallback(async () => {
    if (loading) return;
    // Start history on first reach to bottom
    if (!historyStarted) {
      try {
        setLoading(true);
        const next = 1;
        const histRes = await api.get(
          `/order/concessionare/${user.id}?segment=history&page=${next}&limit=${PAGE_SIZE}`
        );
        const { data: chunk, totalPages } = histRes.data;
        setOrders((prev) => [...prev, ...chunk]);
        setHistoryStarted(true);
        setHistoryPage(next);
        setHasMoreHistory(next < totalPages);
      } catch (e) {
        console.error(e);
        setError("Failed to fetch orders");
      } finally {
        setLoading(false);
      }
      return;
    }
    // Continue history pagination
    if (hasMoreHistory) {
      try {
        setLoading(true);
        const next = historyPage + 1;
        const histRes = await api.get(
          `/order/concessionare/${user.id}?segment=history&page=${next}&limit=${PAGE_SIZE}`
        );
        const { data: chunk, totalPages } = histRes.data;
        setOrders((prev) => [...prev, ...chunk]);
        setHistoryPage(next);
        setHasMoreHistory(next < totalPages);
      } catch (e) {
        console.error(e);
        setError("Failed to fetch orders");
      } finally {
        setLoading(false);
      }
    }
  }, [loading, historyStarted, historyPage, hasMoreHistory, user?.id]);

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
      <View style={{ flex: 1 }}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <Text style={styles.customer}>
          Customer: {item.first_name} {item.last_name}
        </Text>
        {Array.isArray((item as any).item_names_preview) && (item as any).item_names_preview.length > 0 && (
          <Text style={styles.itemsPreview}>
            Items: {(item as any).item_names_preview.join(', ')}
            {typeof (item as any).item_count === 'number' && (item as any).item_count > (item as any).item_names_preview.length
              ? ` +${(item as any).item_count - (item as any).item_names_preview.length} more`
              : ''}
          </Text>
        )}
        <Text>
          Status: <Text style={styles.status}>{item.order_status}</Text>
        </Text>
        {item.order_status === 'declined' && (item as any).decline_reason ? (
          <Text style={styles.declineReason}>Reason: {(item as any).decline_reason}</Text>
        ) : null}
        <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
        <Text>Date: {new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  // Group orders by status when no explicit status filter is applied
  // Ensure ongoing orders (pending, accepted, ready for pickup) appear first
  // Settled orders (completed, declined) appear after
  const groupedSections = (() => {
    if (statusFilter.length > 0) return [] as { title: string; data: Order[] }[];
    const groups: Record<string, Order[]> = {};
    for (const o of filteredOrders) {
      const key = (o.order_status || 'unknown').toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    }
    const ongoingStatuses = ['pending', 'accepted', 'ready for pickup'];
    const settledStatuses = ['completed', 'declined', 'cancelled'];
    const toLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    
    // Separate ongoing and settled orders
    const ongoingKeys: string[] = [];
    const settledKeys: string[] = [];
    const otherKeys: string[] = [];
    
    Object.keys(groups).forEach(key => {
      if (ongoingStatuses.includes(key)) {
        ongoingKeys.push(key);
      } else if (settledStatuses.includes(key)) {
        settledKeys.push(key);
      } else {
        otherKeys.push(key);
      }
    });
    
    // Sort each group by priority
    const sortByPriority = (keys: string[], priority: string[]) => {
      return keys.sort((a, b) => {
        const ai = priority.indexOf(a);
        const bi = priority.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    };
    
    const sortedOngoing = sortByPriority(ongoingKeys, ongoingStatuses);
    const sortedSettled = sortByPriority(settledKeys, settledStatuses);
    const sortedOther = otherKeys.sort();
    
    // Combine: ongoing first, then settled, then others
    const allKeys = [...sortedOngoing, ...sortedSettled, ...sortedOther];
    return allKeys.map((k) => ({ title: toLabel(k), data: groups[k] }));
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
              loading && historyStarted ? (
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
              loading && historyStarted ? (
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
      {loading && !initialLoading && (
        <ActivityIndicator
          size="large"
          color="#A40C2D"
          style={styles.overlayLoader}
        />
      )}
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
  itemsPreview: { fontSize: 12, color: "#333", marginTop: 2 },
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
  fullLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayLoader: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
  },
});

export default OrderList;
