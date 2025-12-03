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
import { Ionicons } from "@expo/vector-icons";
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
  updated_total_price?: number | null;
  price_change_reason?: string | null;
  reopening_requested?: boolean;
}

const PAGE_SIZE = 10;
const ACTIVE_STATUSES = ["pending", "accepted", "ready-for-pickup"];
const HISTORY_STATUSES = ["completed", "declined", "cancelled"];

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

  const formatManila = (value: any) => {
    if (!value) return "";
    try {
      // Just parse and format the timestamp as-is (backend will handle timezone conversion)
      const dateObj = new Date(value);
      if (Number.isNaN(dateObj.getTime())) return String(value);

      // Manual formatting
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[dateObj.getMonth()];
      const day = String(dateObj.getDate()).padStart(2, "0");
      const year = dateObj.getFullYear();

      let hours = dateObj.getHours();
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12

      return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return String(value);
    }
  };

  const formatDateTime = (value: any) => formatManila(value);

  const normalizeStatus = (value: any) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

  const fetchOrders = useCallback(
    async (pageNum = 1, refresh = false) => {
      try {
        if (refresh || pageNum === 1) setInitialLoading(true);

        setError(null);

        // Initial load/refresh: only fetch active orders, do NOT fetch history yet
        if (refresh || pageNum === 1) {
          // Auto-decline any expired GCash receipts in bulk before fetching
          try {
            await api.post("/order/bulk-decline-expired");
          } catch (e) {
            console.warn("Bulk decline expired receipts failed:", e);
          }

          const activeRes = await api.get(
            `/order/concessionare/${user.id}?segment=active&limit=${PAGE_SIZE}`,
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
    },
    [user?.id],
  );

  // Only fetch on initial mount, not on every focus
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setStatusFilter(ACTIVE_STATUSES); // Default to ongoing orders only
      fetchOrders(1, true);
    }
  }, []); // Empty dependency array - only run once on mount

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(1, true);
  };

  // Start history (completed/declined) when needed
  const startHistory = useCallback(async () => {
    if (historyStarted || loading) return;
    try {
      setLoading(true);
      const next = 1;
      const histRes = await api.get(
        `/order/concessionare/${user.id}?segment=history&page=${next}&limit=${PAGE_SIZE}`,
      );
      const { data: chunk, totalPages } = histRes.data;
      setOrders((prev) => {
        const existingIds = new Set(prev.map((o) => o.id));
        const deduped = (chunk || []).filter(
          (o: any) => !existingIds.has(o.id),
        );
        return [...prev, ...deduped];
      });
      setHistoryStarted(true);
      setHistoryPage(next);
      setHasMoreHistory(next < totalPages);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [historyStarted, loading, user?.id]);

  // Load more history on scroll only when history filters are active
  const loadMore = useCallback(async () => {
    if (loading || !historyStarted || !hasMoreHistory) return;

    const hasHistoryFilterSelected = statusFilter.some((s) =>
      HISTORY_STATUSES.includes(normalizeStatus(s)),
    );
    if (!hasHistoryFilterSelected) return;

    try {
      setLoading(true);
      const next = historyPage + 1;
      const histRes = await api.get(
        `/order/concessionare/${user.id}?segment=history&page=${next}&limit=${PAGE_SIZE}`,
      );
      const { data: chunk, totalPages } = histRes.data;
      setOrders((prev) => {
        const existingIds = new Set(prev.map((o) => o.id));
        const deduped = (chunk || []).filter(
          (o: any) => !existingIds.has(o.id),
        );
        return [...prev, ...deduped];
      });
      setHistoryPage(next);
      setHasMoreHistory(next < totalPages);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    historyStarted,
    hasMoreHistory,
    historyPage,
    statusFilter,
    user?.id,
  ]);

  // When history statuses are selected, lazily fetch them once
  useEffect(() => {
    const hasHistoryFilterSelected = statusFilter.some((s) =>
      HISTORY_STATUSES.includes(normalizeStatus(s)),
    );
    if (hasHistoryFilterSelected && !historyStarted) {
      startHistory();
    }
  }, [statusFilter, historyStarted, startHistory]);

  // Apply search, filter, and sort
  useEffect(() => {
    let filtered = [...orders];

    if (searchQuery) {
      const lowered = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.first_name.toLowerCase().includes(lowered) ||
          o.last_name.toLowerCase().includes(lowered) ||
          o.concession_name.toLowerCase().includes(lowered) ||
          o.id.toString().includes(searchQuery),
      );
    }

    if (statusFilter.length > 0) {
      const normalizedSelected = new Set(
        statusFilter.map((s) => normalizeStatus(s)),
      );
      filtered = filtered.filter((o) =>
        normalizedSelected.has(normalizeStatus(o.order_status)),
      );
    }

    if (sortBy) {
      switch (sortBy) {
        case "date_desc":
          filtered.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
          break;
        case "date_asc":
          filtered.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );
          break;
        case "price_asc":
          filtered.sort((a, b) => {
            const totalA = Number(a.updated_total_price ?? a.total_price ?? 0);
            const totalB = Number(b.updated_total_price ?? b.total_price ?? 0);
            return totalA - totalB;
          });
          break;
        case "price_desc":
          filtered.sort((a, b) => {
            const totalA = Number(a.updated_total_price ?? a.total_price ?? 0);
            const totalB = Number(b.updated_total_price ?? b.total_price ?? 0);
            return totalB - totalA;
          });
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={styles.orderId}>Order #{item.id}</Text>
          {item.reopening_requested && item.order_status === "declined" && (
            <View style={styles.reopeningBadge}>
              <Ionicons name="refresh-circle" size={14} color="#fff" />
              <Text style={styles.reopeningBadgeText}>Reopening Request</Text>
            </View>
          )}
        </View>
        <Text style={styles.customer}>
          Customer: {item.first_name} {item.last_name}
        </Text>
        {Array.isArray((item as any).item_names_preview) &&
          (item as any).item_names_preview.length > 0 && (
            <Text style={styles.itemsPreview}>
              Items: {(item as any).item_names_preview.join(", ")}
              {typeof (item as any).item_count === "number" &&
              (item as any).item_count > (item as any).item_names_preview.length
                ? ` +${(item as any).item_count - (item as any).item_names_preview.length} more`
                : ""}
            </Text>
          )}
        <Text>
          Status: <Text style={styles.status}>{item.order_status}</Text>
        </Text>
        {item.order_status === "declined" && (item as any).decline_reason ? (
          <Text style={styles.declineReason}>
            Reason: {(item as any).decline_reason}
          </Text>
        ) : null}
        {item.updated_total_price !== null &&
        item.updated_total_price !== undefined &&
        !Number.isNaN(Number(item.updated_total_price)) &&
        !Number.isNaN(Number(item.total_price)) &&
        Number(item.updated_total_price) !== Number(item.total_price) ? (
          <Text>
            Total: ₱{Number(item.updated_total_price).toFixed(2)} (was ₱
            {Number(item.total_price).toFixed(2)})
          </Text>
        ) : (
          <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
        )}
        <Text>Date: {formatDateTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Group orders by status when no explicit status filter is applied
  // Ensure ongoing orders (pending, accepted, ready for pickup) appear first
  // Settled orders (completed, declined) appear after
  const groupedSections = (() => {
    if (statusFilter.length > 0)
      return [] as { title: string; data: Order[] }[];
    const groups: Record<string, Order[]> = {};
    for (const o of filteredOrders) {
      const key = normalizeStatus(o.order_status || "unknown");
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    }
    const ongoingStatuses = ACTIVE_STATUSES;
    const settledStatuses = HISTORY_STATUSES;
    const toLabel = (s: string) =>
      s.replace(/-/g, " ").replace(/^(.)/, (c) => c.toUpperCase());

    // Separate ongoing and settled orders
    const ongoingKeys: string[] = [];
    const settledKeys: string[] = [];
    const otherKeys: string[] = [];

    Object.keys(groups).forEach((key) => {
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
        <Text style={{ marginTop: 10, color: "#A40C2D" }}>
          Loading orders...
        </Text>
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
      <View style={styles.searchFilterRow}>
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
          <Ionicons name="funnel-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {!orders.length ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      ) : statusFilter.length > 0 ? (
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
          <View style={styles.filterChipRow}>
            {[
              "pending",
              "accepted",
              "ready-for-pickup",
              "completed",
              "declined",
              "cancelled",
            ].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => {
                  if (statusFilter.includes(status)) {
                    setStatusFilter(statusFilter.filter((s) => s !== status));
                  } else {
                    setStatusFilter([...statusFilter, status]);
                  }
                }}
              >
                <Text
                  style={
                    statusFilter.includes(status)
                      ? styles.active
                      : styles.option
                  }
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Sort by</Text>
          <View style={styles.filterChipRow}>
            {[
              { key: "date_desc", label: "Date (Newest → Oldest)" },
              { key: "date_asc", label: "Date (Oldest → Newest)" },
              { key: "price_asc", label: "Total Price (Low → High)" },
              { key: "price_desc", label: "Total Price (High → Low)" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortBy(sortBy === opt.key ? null : opt.key)}
              >
                <Text
                  style={sortBy === opt.key ? styles.active : styles.option}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setStatusFilter(ACTIVE_STATUSES);
                setSortBy(null);
              }}
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
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    columnGap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#A40C2D",
    borderRadius: 999,
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
  declineReason: {
    color: "#dc3545",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: { textAlign: "center", color: "#888", fontSize: 16 },
  errorText: { textAlign: "center", color: "red", marginTop: 20 },
  filterContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  filterHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    color: "#333",
  },
  active: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    borderRadius: 999,
    backgroundColor: "#A40C2D",
    borderWidth: 1,
    borderColor: "#A40C2D",
    color: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
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
  reopeningBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffa500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reopeningBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default OrderList;
