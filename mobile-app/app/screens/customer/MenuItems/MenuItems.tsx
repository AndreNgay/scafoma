// screens/customer/MenuItems.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import api from "../../../libs/apiCall"; // axios instance
import { useNavigation } from "@react-navigation/native";



const MenuItems = () => {
  // data
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [baseItems, setBaseItems] = useState<any[]>([]); // items after server fetch + multi-select filters (no search applied)
  const [cafeterias, setCafeterias] = useState<any[]>([]);
  const [concessions, setConcessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const navigation = useNavigation();

  // filter state
  const [cafeteriaIds, setCafeteriaIds] = useState<number[]>([]);
  const [concessionIds, setConcessionIds] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ui state
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const lastVisibleIndexRef = useRef(0);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (Array.isArray(viewableItems) && viewableItems.length) {
      const maxIndex = Math.max(
        ...viewableItems
          .map((v: any) => (typeof v.index === "number" ? v.index : -1))
          .filter((i: number) => i >= 0)
      );
      if (!Number.isNaN(maxIndex)) {
        lastVisibleIndexRef.current = Math.max(lastVisibleIndexRef.current, maxIndex);
      }
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const [filtersVisible, setFiltersVisible] = useState(false);

  // fetch cafeterias + concessions
  const fetchFilterData = async () => {
    try {
      const cafRes = await api.get("/cafeteria/all");
      const conRes = await api.get("/concession/all");
      setCafeterias(cafRes.data.data);
      setConcessions(conRes.data.data);
    } catch (err) {
      console.error("Error loading filter data:", err);
    }
  };

  // fetch menu items and extract categories
  const fetchItems = async (targetPage = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (targetPage === 1) setLoading(true);
      else setIsLoadingMore(true);

      // Backend supports single values; use the first selected for server-side narrowing when available
      const res = await api.get<{ data: any[]; pagination?: any }>("/menu-item/all", {
        params: {
          cafeteriaId: cafeteriaIds.length === 1 ? cafeteriaIds[0] : undefined,
          concessionId: concessionIds.length === 1 ? concessionIds[0] : undefined,
          category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
          sortBy,
          page: targetPage,
          limit,
        },
      });

      const items = res.data.data as {
        id: number;
        item_name: string;
        concession_name: string;
        concession_id: number;
        cafeteria_id: number;
        cafeteria_name: string;
        price: number;
        category?: string;
        image_url?: string;
      }[];

      // Update pagination
      const pagination = (res.data as any).pagination || {};
      setTotalPages(pagination.totalPages || totalPages);

      // Merge pages into a unique list before client filtering
      const merged = targetPage === 1 || isRefresh ? items : [...baseItems, ...items];
      const uniqueById: any[] = [];
      const seen = new Set<number>();
      for (const it of merged) {
        if (!seen.has(it.id)) { seen.add(it.id); uniqueById.push(it); }
      }

      // client-side filtering for multi-select
      const filtered = uniqueById.filter((it) => {
        const cafeteriaOk = cafeteriaIds.length
          ? cafeteriaIds.includes((it as any).cafeteria_id)
          : true;
        const concessionOk = concessionIds.length
          ? concessionIds.includes((it as any).concession_id)
          : true;
        const categoryOk = selectedCategories.length
          ? selectedCategories.includes((it as any).category || "")
          : true;
        return cafeteriaOk && concessionOk && categoryOk;
      });
      setBaseItems(filtered);
      // Apply current search locally for snappy UX
      const q = searchQuery.trim().toLowerCase();
      const searched = q
        ? filtered.filter((it) =>
            (it.item_name || "").toLowerCase().includes(q) ||
            (it.concession_name || "").toLowerCase().includes(q) ||
            (it.cafeteria_name || "").toLowerCase().includes(q) ||
            ((it.category || "").toLowerCase().includes(q))
          )
        : filtered;
      setMenuItems(searched);

      // derive categories dynamically
      const categorySource = filtered.length ? filtered : uniqueById;
      const uniqueCategories: string[] = Array.from(
        new Set(categorySource.map((i: any) => i.category || "").filter(Boolean))
      );

      setCategories(uniqueCategories);
    } catch (err) {
      console.error("Error fetching menu items:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFilterData();
    fetchItems(1, true);
  }, []);

  useEffect(() => {
    setPage(1);
    fetchItems(1, true);
  }, [cafeteriaIds, concessionIds, selectedCategories, sortBy]);

  // Fast local search on top of already-filtered items
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setMenuItems(baseItems);
      return;
    }
    setMenuItems(
      baseItems.filter((it) =>
        (it.item_name || "").toLowerCase().includes(q) ||
        (it.concession_name || "").toLowerCase().includes(q) ||
        (it.cafeteria_name || "").toLowerCase().includes(q) ||
        ((it.category || "").toLowerCase().includes(q))
      )
    );
  }, [searchQuery, baseItems]);

  const renderItem = ({ item }: { item: any }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      (navigation as any).navigate("Menu Item Details", {
        item,
        concession: concessions.find((c) => c.id === item.concession_id),
        cafeteria: cafeterias.find((caf) => caf.id === item.cafeteria_id),
        cafeteriaName: item.cafeteria_name,
      })
    }
  >


      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.subText}>
          {item.concession_name} • {item.cafeteria_name}
        </Text>
        {(() => {
          const feedbackCount = Number((item as any).feedback?.feedback_count ?? (item as any).feedback_count ?? 0);
          const avgRating = (item as any).feedback?.avg_rating ?? (item as any).avg_rating;
          if (feedbackCount > 0 && avgRating !== null && avgRating !== undefined) {
            return (
              <Text style={styles.feedbackText}>⭐ {Number(avgRating).toFixed(1)} ({feedbackCount})</Text>
            );
          }
          return <Text style={styles.feedbackEmpty}>No feedback yet</Text>;
        })()}
        {item.category && (
          <Text style={styles.categoryTag}>{item.category}</Text>
        )}
        {(() => {
          const base = Number(item.price || 0);
          if (base > 0) return <Text style={styles.price}>₱{base.toFixed(2)}</Text>;

          const groups = (item as any).variations || [];
          if (!groups.length) return <Text style={styles.price}>₱0.00</Text>;

          // Helper to get sorted price list for a group's variations
          const getSortedPrices = (g: any) =>
            (g.variations || [])
              .map((v: any) => Number(v.price))
              .filter((n: number) => Number.isFinite(n))
              .sort((a: number, b: number) => a - b);

          // Minimum extra: sum the cheapest options required by group constraints
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

          // Maximum extra: sum the most expensive options allowed by group constraints
          let maxExtra = 0;
          for (const g of groups) {
            const prices = getSortedPrices(g);
            if (!prices.length) continue;
            const multiple = !!g.multiple_selection;
            const maxSel = Number.isFinite(Number(g.max_selection)) && Number(g.max_selection) > 0
              ? Number(g.max_selection)
              : (multiple ? prices.length : 1);
            const chosen = prices.slice(-maxSel); // most expensive allowed
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
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search menu items..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Filter button */}
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => setFiltersVisible(true)}
      >
        <Text style={styles.filterText}>Filters & Sort</Text>
      </TouchableOpacity>

      {/* Items */}
      {loading && page === 1 ? (
        <ActivityIndicator size="large" color="#A40C2D" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={menuItems}
          renderItem={renderItem}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={{ padding: 10 }}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          refreshing={refreshing}
          onRefresh={() => {
            setPage(1);
            fetchItems(1, true);
          }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            const remaining = menuItems.length - (lastVisibleIndexRef.current + 1);
            if (!isLoadingMore && page < totalPages && remaining <= 10) {
              const next = page + 1;
              setPage(next);
              fetchItems(next);
            }
          }}
          ListFooterComponent={isLoadingMore ? (
            <ActivityIndicator size="small" color="#A40C2D" style={{ marginVertical: 12 }} />
          ) : null}
        />
      )}

      {/* Filter modal */}
      <Modal visible={filtersVisible} animationType="slide" onRequestClose={() => setFiltersVisible(false)}>
        <View style={styles.filterContainer}>
          <View style={styles.filterHeaderRow}>
            <Text style={styles.filterHeader}>Filters</Text>
            <TouchableOpacity onPress={() => setFiltersVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <FlatList
              data={[{ key: 'content' }]}
              keyExtractor={(i) => i.key}
              renderItem={() => (
                <>
                  {/* Cafeteria (multi-select) */}
                  <Text style={styles.label}>Cafeteria</Text>
                  {cafeterias.map((caf) => {
                    const active = cafeteriaIds.includes(caf.id);
                    return (
                      <TouchableOpacity
                        key={caf.id}
                        onPress={() => {
                          setCafeteriaIds((prev) =>
                            active ? prev.filter((id) => id !== caf.id) : [...prev, caf.id]
                          );
                        }}
                      >
                        <Text style={active ? styles.active : styles.option}>
                          {caf.cafeteria_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Concession (multi-select) */}
                  <Text style={styles.label}>Concession</Text>
                  {concessions
                    .filter((c) =>
                      cafeteriaIds.length ? cafeteriaIds.includes(c.cafeteria_id) : true
                    )
                    .map((c) => {
                      const active = concessionIds.includes(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => {
                            setConcessionIds((prev) =>
                              active ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                        >
                          <Text style={active ? styles.active : styles.option}>
                            {c.concession_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                  {/* Category (unique + multi-select) */}
                  <Text style={styles.label}>Category</Text>
                  {categories.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          setSelectedCategories((prev) =>
                            active ? prev.filter((c) => c !== cat) : [...prev, cat]
                          );
                        }}
                      >
                        <Text style={active ? styles.active : styles.option}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Sort */}
                  <Text style={styles.label}>Sort by</Text>
                  {[
                    { key: "name", label: "Name (A → Z)" },
                    { key: "price_asc", label: "Price (Low → High)" },
                    { key: "price_desc", label: "Price (High → Low)" },
                  ].map((opt) => (
                    <TouchableOpacity key={opt.key} onPress={() => setSortBy(opt.key)}>
                      <Text style={sortBy === opt.key ? styles.active : styles.option}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            />
          </View>

          {/* Apply / Close */}
          <TouchableOpacity style={styles.applyBtn} onPress={() => setFiltersVisible(false)}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 14, // space from header
    backgroundColor: "#fff",
  },
  filterBtn: {
    padding: 10,
    backgroundColor: "#A40C2D",
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  filterText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    elevation: 2,
  },
  image: { width: 70, height: 70, borderRadius: 8, marginRight: 10 },
  placeholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#ddd",
    marginRight: 10,
  },
  itemName: { fontWeight: "bold", fontSize: 16 },
  subText: { fontSize: 12, color: "#555" },
  categoryTag: {
    marginTop: 3,
    fontSize: 12,
    color: "#A40C2D",
    fontWeight: "600",
  },
  price: { marginTop: 5, fontWeight: "600", color: "#A40C2D" },
  feedbackText: { marginTop: 2, fontSize: 12, color: "#111" },
  feedbackEmpty: { marginTop: 2, fontSize: 12, color: "#888", fontStyle: "italic" },
  filterContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  filterHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  filterHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  closeText: { color: "#A40C2D", fontWeight: "600", fontSize: 14 },
  label: { marginTop: 15, fontWeight: "600" },
  option: { padding: 8, fontSize: 14 },
  active: {
    padding: 8,
    fontSize: 14,
    backgroundColor: "#A40C2D",
    color: "#fff",
    borderRadius: 6,
  },
  applyBtn: {
    backgroundColor: "#A40C2D",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  applyText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});

export default MenuItems;
