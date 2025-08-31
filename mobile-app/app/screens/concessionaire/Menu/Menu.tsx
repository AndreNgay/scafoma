import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../../libs/apiCall";

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
  const navigation = useNavigation<any>();

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const res = await api.get(`/menu-item`);
        setMenuItems(res.data.data);
      } catch (error) {
        console.error("Error fetching menu items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenuItems();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a00" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Add Menu Item Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddMenu")}
      >
        <Text style={styles.addButtonText}>+ Add Menu Item</Text>
      </TouchableOpacity>

      {menuItems.length === 0 ? (
        <View style={styles.center}>
          <Text>No menu items found.</Text>
        </View>
      ) : (
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
      )}
    </View>
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
  addButton: {
    backgroundColor: "darkred",
    padding: 12,
    margin: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
