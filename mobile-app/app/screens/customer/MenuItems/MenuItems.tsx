// screens/MenuItems.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../../libs/apiCall";

interface MenuItem {
  id: number;
  item_name: string;
  price: number;
  availability: boolean;
  concession_name: string;
  image_url: string | null;
}

const MenuItems = () => {
  const navigation = useNavigation<any>();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMenuItems = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.get(`/menu-item/all?page=${pageNum}&limit=10`);
      const items: MenuItem[] = res.data.data;

      const filtered = items.filter(
        (item) => item.availability === true && item.concession_name
      );

      if (pageNum === 1) {
        setMenuItems(filtered);
      } else {
        setMenuItems((prev) => [...prev, ...filtered]);
      }

      setHasMore(pageNum < res.data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMenuItems(1);
  }, []);
  const loadMore = () => {
  if (!loadingMore && hasMore) {
      fetchMenuItems(page + 1);
    }
  };
  

  const renderItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("MenuItemDetails", { itemId: item.id })}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.concessionName}>{item.concession_name}</Text>
        <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#A40C2D" />
      </View>
    );
  }

  if (menuItems.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No menu items available.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={menuItems}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <View style={{ padding: 10 }}>
            <ActivityIndicator size="small" color="#A40C2D" />
          </View>
        ) : null
      }
    />

  );
};

export default MenuItems;

const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
  },
  image: {
    width: 100,
    height: 100,
  },
  placeholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#666",
    fontSize: 12,
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  concessionName: {
    fontSize: 14,
    color: "#555",
    marginVertical: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
    color: "#A40C2D", // matches your preferred theme
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
