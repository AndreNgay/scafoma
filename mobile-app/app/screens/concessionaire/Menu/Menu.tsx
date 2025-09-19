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
  concession_name?: string;
  cafeteria_name?: string;
  variations?: Variation[];
};

const Menu = () => {
  const user = useStore((state: any) => state.user);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  // 🔎 Search + ↕️ Sort + Category Filter
  const processedItems = useMemo(() => {
    let items = [...menuItems];

    if (search.trim()) {
      items = items.filter((item) =>
        item.item_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      items = items.filter((item) => item.category === categoryFilter);
    }

    items.sort((a, b) => {
      let compareVal = 0;
      switch (sortOption) {
        case "name":
          compareVal = a.item_name.localeCompare(b.item_name);
          break;
        case "price_asc":
          compareVal = a.price - b.price;
          break;
        case "price_desc":
          compareVal = b.price - a.price;
          break;
        case "category":
          compareVal = (a.category || "").localeCompare(b.category || "");
          break;
        case "availability":
          compareVal = a.availability === b.availability ? 0 : a.availability ? -1 : 1;
          break;
      }
      return sortOrder === "asc" ? compareVal : -compareVal;
    });

    return items;
  }, [menuItems, search, categoryFilter, sortOption, sortOrder]);

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

      {/* Sort Controls */}
      <View style={styles.controls}>
        <Picker
          selectedValue={sortOption}
          style={styles.picker}
          onValueChange={(val) => setSortOption(val)}
        >
          <Picker.Item label="Sort by Name" value="name" />
          <Picker.Item label="Sort by Price Asc" value="price_asc" />
          <Picker.Item label="Sort by Price Desc" value="price_desc" />
          <Picker.Item label="Sort by Category" value="category" />
          <Picker.Item label="Sort by Availability" value="availability" />
        </Picker>

        <Picker
          selectedValue={sortOrder}
          style={styles.picker}
          onValueChange={(val) => setSortOrder(val)}
        >
          <Picker.Item label="Ascending" value="asc" />
          <Picker.Item label="Descending" value="desc" />
        </Picker>
      </View>

      {/* Category Filter */}
      <View style={styles.controls}>
        <Picker
          selectedValue={categoryFilter}
          style={styles.picker}
          onValueChange={(val) => setCategoryFilter(val)}
        >
          <Picker.Item label="All Categories" value="all" />
          <Picker.Item label="Drinks" value="Drinks" />
          <Picker.Item label="Snacks" value="Snacks" />
          <Picker.Item label="Meals" value="Meals" />
          <Picker.Item label="Desserts" value="Desserts" />
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
              onPress={() => navigation.navigate("Edit Menu", { menuItem: item })}
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
                <Text style={styles.price}>₱ {item.price.toFixed(2)}</Text>
                {item.category && (
                  <Text style={styles.category}>Category: {item.category}</Text>
                )}

                <Text style={{ color: item.availability ? "green" : "red", marginTop: 2 }}>
                  {item.availability ? "Available" : "Unavailable"}
                </Text>
                {item.variations && item.variations.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    {item.variations.map((v) => (
                      <Text key={v.label} style={styles.subInfo}>
                        {v.label}: {v.variations.map((x) => x.name).join(", ")}
                      </Text>
                    ))}
                  </View>
                )}
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
  subInfo: {
    fontSize: 12,
    color: "#555",
    marginTop: 1,
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
