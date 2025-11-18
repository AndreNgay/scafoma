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
  Modal,
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
  const [availabilityLoadingId, setAvailabilityLoadingId] = useState<number | null>(null);

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
    setSelectedItem(item);
  };

  const closeActions = () => {
    if (deleteLoading) return;
    setSelectedItem(null);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    closeActions();
    navigation.navigate("Edit Menu", { menuItem: item });
  };

  const handlePreviewAsCustomer = (item: MenuItem) => {
    closeActions();
    navigation.navigate("View Menu", { menuItem: item });
  };

  const handleToggleAvailability = async (item: MenuItem, nextAvailable: boolean) => {
    try {
      setAvailabilityLoadingId(item.id);
      const formData = new FormData();
      formData.append("availability", nextAvailable ? "true" : "false");

      const existingVariations = (item as any).variations;
      if (existingVariations && Array.isArray(existingVariations)) {
        formData.append("variations", JSON.stringify(existingVariations));
      }

      await api.put(`/menu-item/${item.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, availability: nextAvailable } : m))
      );

      showToast(
        "success",
        nextAvailable ? "Menu item marked as available" : "Menu item marked as unavailable"
      );
      closeActions();
    } catch (error: any) {
      console.error("Error updating availability:", error);
      const message =
        error?.response?.data?.message || "Failed to update availability. Please try again.";
      showToast("error", message);
    } finally {
      setAvailabilityLoadingId(null);
    }
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
                navigation.navigate("Edit Menu", { menuItem: item });
              }}
              onLongPress={() => openActions(item)}
              delayLongPress={250}
              activeOpacity={0.9}
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
                <View style={styles.infoHeader}>
                  <Text style={styles.name} numberOfLines={1}>{item.item_name}</Text>
                  <View
                    style={[
                      styles.statusChip,
                      item.availability ? styles.statusChipAvailable : styles.statusChipUnavailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        item.availability
                          ? styles.statusChipTextAvailable
                          : styles.statusChipTextUnavailable,
                      ]}
                    >
                      {item.availability ? "Available" : "Unavailable"}
                    </Text>
                  </View>
                </View>
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
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      {selectedItem && (
        <Modal
          visible={!!selectedItem}
          transparent
          animationType="fade"
          onRequestClose={closeActions}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeActions}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalSheet}
              onPress={() => {}}
            >
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedItem.item_name}
              </Text>
              <Text style={styles.modalSubtitle}>Choose an action</Text>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleEditMenuItem(selectedItem)}
                disabled={deleteLoading || availabilityLoadingId === selectedItem.id}
              >
                <Text style={styles.modalOptionText}>Edit item</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handlePreviewAsCustomer(selectedItem)}
                disabled={deleteLoading || availabilityLoadingId === selectedItem.id}
              >
                <Text style={styles.modalOptionText}>Customer preview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() =>
                  handleToggleAvailability(
                    selectedItem,
                    selectedItem.availability === false ? true : false
                  )
                }
                disabled={deleteLoading || availabilityLoadingId === selectedItem.id}
              >
                <Text style={styles.modalOptionText}>
                  {availabilityLoadingId === selectedItem.id
                    ? "Updating availability..."
                    : selectedItem.availability === false
                    ? "Mark as available"
                    : "Mark as unavailable"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, styles.modalOptionDanger]}
                onPress={() => handleDeleteMenuItem(selectedItem)}
                disabled={deleteLoading || availabilityLoadingId === selectedItem.id}
              >
                <Text style={styles.modalOptionDangerText}>
                  {deleteLoading ? "Deleting..." : "Delete item"}
                </Text>
              </TouchableOpacity>

            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
      
      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => navigation.navigate("Add Menu")}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.floatingAddButtonText}>New menu item</Text>
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
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    columnGap: 8,
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
    fontSize: 16,
    fontWeight: "600",
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 8,
  },
  statusChipAvailable: {
    backgroundColor: "#e4f7ec",
  },
  statusChipUnavailable: {
    backgroundColor: "#fdecea",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusChipTextAvailable: {
    color: "#1b5e20",
  },
  statusChipTextUnavailable: {
    color: "#b71c1c",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: "#555",
  },
  modalOption: {
    paddingVertical: 10,
  },
  modalOptionText: {
    fontSize: 15,
    color: "#222",
  },
  modalOptionDanger: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    marginTop: 4,
    paddingTop: 12,
  },
  modalOptionDangerText: {
    fontSize: 15,
    color: "#d32f2f",
    fontWeight: "600",
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
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
