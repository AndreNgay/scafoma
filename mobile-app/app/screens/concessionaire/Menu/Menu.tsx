import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";

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
  const [groupByCategory, setGroupByCategory] = useState(true);

  const navigation = useNavigation<any>();

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

  useFocusEffect(
    useCallback(() => {
      fetchMenuItems(1, true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenuItems(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) fetchMenuItems(page + 1);
  };

  const processedItems = useMemo(() => {
    let items = [...menuItems];
    if (search.trim()) items = items.filter((i) => i.item_name.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [menuItems, search]);

  const groupedItems = useMemo(() => {
    if (!groupByCategory) {
      return [{ title: "All Items", data: processedItems }];
    }

    const groups: { [key: string]: MenuItem[] } = {};
    
    processedItems.forEach(item => {
      const category = item.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return Object.keys(groups)
      .sort()
      .map(category => ({
        title: category,
        data: groups[category]
      }));
  }, [processedItems, groupByCategory]);

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

      {/* Group by Category Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, groupByCategory && styles.toggleButtonActive]}
          onPress={() => setGroupByCategory(!groupByCategory)}
        >
          <Text style={[styles.toggleButtonText, groupByCategory && styles.toggleButtonTextActive]}>
            {groupByCategory ? "📁 Grouped by Category" : "📄 List View"}
          </Text>
        </TouchableOpacity>
      </View>

      {processedItems.length === 0 ? (
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
            loadingMore ? <ActivityIndicator size="small" color="darkred" style={{ margin: 10 }} /> : null
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("View Menu", { menuItem: item })}
            >
              <Image
                source={{
                  uri: !imageError[item.id] && item.image_url
                    ? item.image_url
                    : "https://cdn-icons-png.flaticon.com/512/9417/9417083.png",
                }}
                style={styles.image}
                onError={() => setImageError((prev) => ({ ...prev, [item.id]: true }))}
              />
              <View style={styles.info}>
                <Text style={styles.name}>{item.item_name}</Text>
                <Text style={styles.price}>₱ {item.price.toFixed(2)}</Text>
                {item.category && <Text style={styles.category}>Category: {item.category}</Text>}
                <Text style={{ color: item.availability ? "green" : "red", marginTop: 2 }}>
                  {item.availability ? "Available" : "Unavailable"}
                </Text>
                {item.variations && item.variations.length > 0 &&
                  item.variations.map((v) => (
                    <Text key={v.label} style={styles.subInfo}>
                      {v.label}: {v.variations.map((x) => x.name).join(", ")}
                    </Text>
                  ))
                }
              </View>

              {/* Edit button */}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate("Edit Menu", { menuItem: item })}
              >
                <Text style={styles.editButtonText}>✎</Text>
              </TouchableOpacity>
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
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600" },
  price: { marginTop: 2, fontSize: 14, color: "darkred", fontWeight: "500" },
  category: { fontSize: 13, color: "#444", marginTop: 2 },
  subInfo: { fontSize: 12, color: "#555", marginTop: 1 },
  searchInput: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  editButton: {
    position: "absolute",
    top: 8,
    right: 8,
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
    borderLeftColor: "darkred",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "darkred",
    textTransform: "uppercase",
  },
  toggleContainer: {
    marginHorizontal: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  toggleButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleButtonActive: {
    backgroundColor: "darkred",
    borderColor: "darkred",
  },
  toggleButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: "white",
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
});
