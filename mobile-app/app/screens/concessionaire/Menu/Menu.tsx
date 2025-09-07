import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

import api from "../../../libs/apiCall";

type MenuItem = {
  id: number;
  item_name: string;
  price: string;
  category?: string;
  image_url?: string;
  availability?: boolean; 
};

const Menu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  
  

  const navigation = useNavigation<any>();

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/menu-item`);
      setMenuItems(res.data.data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMenuItems();
    }, [])
  );

  // 🔎 Search + ↕️ Sort
  const processedItems = useMemo(() => {
    let items = [...menuItems];

    if (search.trim()) {
      items = items.filter((item) =>
        item.item_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    items.sort((a, b) => {
      let compareVal = 0;

      if (sortOption === "name") {
        compareVal = a.item_name.localeCompare(b.item_name);
      } else if (sortOption === "price") {
        compareVal = parseFloat(a.price) - parseFloat(b.price);
      } else if (sortOption === "category") {
        compareVal = (a.category || "").localeCompare(b.category || "");
      } else if (sortOption === "availability") {
        compareVal = (a.availability === b.availability) ? 0 : a.availability ? -1 : 1;
      }

      return sortOrder === "asc" ? compareVal : -compareVal;
    });

    return items;
  }, [menuItems, search, sortOption, sortOrder]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a00" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("Add Menu")}
      >
        <Text style={styles.addButtonText}>+ Add Menu Item</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.searchInput}
        placeholder="Search menu..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.controls}>
        <Picker selectedValue={sortOption} style={styles.picker} onValueChange={(val) => setSortOption(val)}>
          <Picker.Item label="Sort by Name" value="name" />
          <Picker.Item label="Sort by Price" value="price" />
          <Picker.Item label="Sort by Category" value="category" />
          <Picker.Item label="Sort by Availability" value="availability" /> {/* ✅ */}
        </Picker>

        <Picker selectedValue={sortOrder} style={styles.picker} onValueChange={(val) => setSortOrder(val)}>
          <Picker.Item label="Ascending" value="asc" />
          <Picker.Item label="Descending" value="desc" />
        </Picker>
      </View>

      {processedItems.length === 0 ? (
        <View style={styles.center}>
          <Text>No menu items found.</Text>
        </View>
      ) : (
        <FlatList
          data={processedItems}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("Edit Menu", { item })}
            >
              <Image
                source={{
                  uri:
                    !imageError[item.id] && item.image_url
                      ? item.image_url
                      : "https://cdn-icons-png.flaticon.com/512/9417/9417083.png",
                }}
                style={styles.image}
                onError={() =>
                  setImageError((prev) => ({ ...prev, [item.id]: true }))
                }
              />


              <View style={styles.info}>
                <Text style={styles.name}>{item.item_name}</Text>
                <Text style={styles.price}>₱ {item.price}</Text>
                {item.category && (
                  <Text style={styles.category}>Category: {item.category}</Text>
                )}
                <Text style={{ color: item.availability ? "green" : "red", marginTop: 2 }}>
                  {item.availability ? "Available" : "Unavailable"}
                </Text>
              </View>
            </TouchableOpacity>
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
    marginTop: 2,
    fontSize: 14,
    color: "darkred",
    fontWeight: "500",
  },
  category: {
    fontSize: 13,
    color: "#444",
    marginTop: 2,
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
  searchInput: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginBottom: 10,
  },
  picker: {
    flex: 1,
    marginHorizontal: 4,
  },
});
