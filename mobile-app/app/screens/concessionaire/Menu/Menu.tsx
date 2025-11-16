import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  SectionList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../../../store";
import api from "../../../libs/apiCall";
import { useToast } from "../../../contexts/ToastContext";

type Variation = {
  label: string;
  variations: { name: string; price: number }[];
};

type MenuItem = {
  id: number;
  item_name: string;
  price: number;
  category?: string;
  image_url?: string;
  availability?: boolean;
  variations?: Variation[];
};

const Menu = () => {
  const user = useStore((state: any) => state.user);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  // Align with customer menu UI: simple list (no grouping toggle)

  const navigation = useNavigation<any>();
  const hasInitialized = useRef(false);
  const { showToast } = useToast();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null); // item with open overflow
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMenuItems = async (pageNum = 1, replace = false) => {
    try {
      if (pageNum === 1 && !refreshing) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);

      const res = await api.get(`/menu-item`, { params: { page: pageNum, limit: 10 } });
      const newItems = res.data.data || [];
      const pagination = res.data.pagination;

      setMenuItems((prev) => (replace || pageNum === 1 ? newItems : [...prev, ...newItems]));
      setHasMore(pagination.page < pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Only fetch on initial mount, not on every focus
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchMenuItems(1, true);
    }
  }, []); // Empty dependency array - only run once on mount

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenuItems(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) fetchMenuItems(page + 1);
  };

  const openActions = (item: MenuItem) => {
    setSelectedItem((prev) => (prev && prev.id === item.id ? null : item));
  };

  const closeActions = () => {
    if (deleteLoading) return;
    setSelectedItem(null);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    closeActions();
    navigation.navigate("Edit Menu", { menuItem: item });
  };

  const performDeleteMenuItem = async (item: MenuItem) => {
    try {
      setDeleteLoading(true);
      await api.delete(`/menu-item/${item.id}`);
      setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
      showToast("success", "Menu item deleted successfully");
      closeActions();
    } catch (error: any) {
      console.error("Error deleting menu item:", error);
      const message =
        error?.response?.data?.message || "Failed to delete menu item. Please try again.";
      showToast("error", message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteMenuItem = (item: MenuItem) => {
    Alert.alert(
      "Delete menu item",
      `Are you sure you want to delete "${item.item_name}"?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, delete",
          style: "destructive",
          onPress: () => performDeleteMenuItem(item),
        },
      ]
    );
  };

  const processedItems = useMemo(() => {
    let items = [...menuItems];
    if (search.trim()) items = items.filter((i) => i.item_name.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [menuItems, search]);

  // Group items by category for a SectionList
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: MenuItem[] } = {};
    processedItems.forEach((item) => {
      const category = item.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return Object.keys(groups)
      .sort()
      .map((category) => ({ title: category, data: groups[category] }));
  }, [processedItems]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a00" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search menu..."
        value={search}
        onChangeText={setSearch}
      />

      {groupedItems.length === 0 ? (
        <View style={styles.center}>
          <Text>No menu items found.</Text>
        </View>
      ) : (
        <SectionList
          sections={groupedItems}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#A40C2D" style={{ margin: 10 }} /> : null
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                // If any menu is open, close it instead of navigating (click outside behavior)
                if (selectedItem) {
                  closeActions();
                  return;
                }
                navigation.navigate("View Menu", { menuItem: item });
              }}
              activeOpacity={0.8}
            >
              {(!imageError[item.id] && item.image_url) ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.image}
                  onError={() => setImageError((prev) => ({ ...prev, [item.id]: true }))}
                />
              ) : (
                <View style={styles.placeholder} />
              )}
              <View style={styles.info}>
                <Text style={styles.name}>{item.item_name}</Text>
                {item.category ? (
                  <Text style={styles.categoryTag}>{item.category}</Text>
                ) : null}
                {(() => {
                  const base = Number(item.price || 0);
                  if (base > 0) return <Text style={styles.price}>₱{base.toFixed(2)}</Text>;

                  const groups = (item as any).variations || [];
                  if (!groups.length) return <Text style={styles.price}>₱0.00</Text>;

                  const getSortedPrices = (g: any) =>
                    (g.variations || [])
                      .map((v: any) => Number(v.price))
                      .filter((n: number) => Number.isFinite(n))
                      .sort((a: number, b: number) => a - b);

                  let minExtra = 0;
                  for (const g of groups) {
                    const prices = getSortedPrices(g);
                    if (!prices.length) continue;
                    const required = !!g.required_selection;
                    const minSel = Number(g.min_selection || 0);
                    const need = Math.max(required ? 1 : 0, minSel);
                    for (let i = 0; i < need && i < prices.length; i++) {
                      minExtra += prices[i];
                    }
                  }

                  let maxExtra = 0;
                  for (const g of groups) {
                    const prices = getSortedPrices(g);
                    if (!prices.length) continue;
                    const multiple = !!g.multiple_selection;
                    const maxSel = Number.isFinite(Number(g.max_selection)) && Number(g.max_selection) > 0
                      ? Number(g.max_selection)
                      : (multiple ? prices.length : 1);
                    const chosen = prices.slice(-maxSel);
                    for (const p of chosen) maxExtra += p;
                  }

                  const low = base + minExtra;
                  const high = base + Math.max(minExtra, maxExtra);
                  if (!Number.isFinite(low) || !Number.isFinite(high)) return <Text style={styles.price}>₱0.00</Text>;

                  return (
                    <Text style={styles.price}>
                      {low === high ? `₱${low.toFixed(2)}` : `₱${low.toFixed(2)} - ₱${high.toFixed(2)}`}
                    </Text>
                  );
                })()}
                <Text style={{ color: item.availability ? "green" : "red", marginTop: 2 }}>
                  {item.availability ? "Available" : "Unavailable"}
                </Text>
              </View>

              <View style={styles.overflowContainer} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openActions(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
                </TouchableOpacity>

                {selectedItem?.id === item.id && (
                  <View style={styles.overflowMenu}>
                    <TouchableOpacity
                      style={styles.overflowOption}
                      onPress={() => handleEditMenuItem(item)}
                      disabled={deleteLoading}
                    >
                      <Text style={styles.overflowOptionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.overflowOption, styles.overflowOptionDanger]}
                      onPress={() => handleDeleteMenuItem(item)}
                      disabled={deleteLoading}
                    >
                      <Text style={styles.overflowOptionDangerText}>
                        {deleteLoading ? "Deleting..." : "Delete"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      
      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => navigation.navigate("Add Menu")}
      >
        <Text style={styles.floatingAddButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Menu;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    padding: 10,
    alignItems: "center",
    position: "relative",
  },
  image: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholder: { width: 70, height: 70, borderRadius: 8, backgroundColor: "#ddd", marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600" },
  price: { marginTop: 5, fontSize: 14, color: "#A40C2D", fontWeight: "600" },
  categoryTag: { marginTop: 3, fontSize: 12, color: "#A40C2D", fontWeight: "600" },
  subInfo: { fontSize: 12, color: "#555", marginTop: 1 },
  searchInput: {
    marginHorizontal: 12,
    marginTop: 12, // space from header
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  editButton: {
    backgroundColor: "darkred",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  editButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  sectionHeader: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#A40C2D",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#A40C2D",
    textTransform: "uppercase",
  },

  floatingAddButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "darkred",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingAddButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  overflowContainer: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  overflowMenu: {
    position: "absolute",
    right: 36,
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    paddingVertical: 4,
    minWidth: 120,
  },
  overflowOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  overflowOptionText: {
    fontSize: 14,
    color: "#333",
  },
  overflowOptionDanger: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  overflowOptionDangerText: {
    fontSize: 14,
    color: "#d32f2f",
    fontWeight: "600",
  },
});
