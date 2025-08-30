import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet } from "react-native";
import api from "../../libs/apiCall";

type MenuItem = {
  id: number;
  item_name: string;
  price: string;
  image_url?: string;
  concession_name?: string;
};

const Menu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const res = await api.get(`/menu-item`); // token must be included
        setMenuItems(res.data.data); // ✔️ access the array inside "data"
        console.log("Fetched menu items:", res.data.data);
      } catch (error) {
        console.error("Error fetching menu items:", error);
      } finally {
        setLoading(false);
      }
    };

    // 🚀 Call the function here
    fetchMenuItems();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a00" />
      </View>
    );
  }

  if (menuItems.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No menu items found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={menuItems}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={{ color: "#666" }}>No Image</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{item.item_name}</Text>
            <Text style={styles.price}>₱ {item.price}</Text>
          </View>
        </View>
      )}
    />
  );
};

export default Menu;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 12,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    padding: 10,
    alignItems: "center",
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  imagePlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    marginTop: 4,
    fontSize: 14,
    color: "darkred",
    fontWeight: "500",
  },
});
