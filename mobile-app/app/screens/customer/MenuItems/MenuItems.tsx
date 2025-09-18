// screens/customer/MenuItems.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import api from "../../../libs/apiCall"; // axios instance

const MenuItems = () => {
  // data
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cafeterias, setCafeterias] = useState<any[]>([]);
  const [concessions, setConcessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // filter state
  const [cafeteriaId, setCafeteriaId] = useState<number | null>(null);
  const [concessionId, setConcessionId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("name");

  // ui state
  const [loading, setLoading] = useState(false);
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
const fetchItems = async () => {
  try {
    setLoading(true);

    const res = await api.get<{ data: any[] }>("/menu-item/all", {
      params: { cafeteriaId, concessionId, category, sortBy },
    });

    const items = res.data.data as {
      id: number;
      item_name: string;
      concession_name: string;
      cafeteria_name: string;
      price: number;
      category?: string;
      image_url?: string;
    }[];

    setMenuItems(items);

    // derive categories dynamically
    const uniqueCategories: string[] = Array.from(
      new Set(items.map((i) => i.category || "").filter(Boolean))
    );

    setCategories(uniqueCategories);
  } catch (err) {
    console.error("Error fetching menu items:", err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchFilterData();
    fetchItems();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [cafeteriaId, concessionId, category, sortBy]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card}>
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
        <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Filter button */}
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => setFiltersVisible(true)}
      >
        <Text style={styles.filterText}>Filters & Sort</Text>
      </TouchableOpacity>

      {/* Items */}
      {loading ? (
        <ActivityIndicator size="large" color="#A40C2D" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={menuItems}
          renderItem={renderItem}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

      {/* Filter modal */}
      <Modal visible={filtersVisible} animationType="slide">
        <View style={styles.filterContainer}>
          <Text style={styles.filterHeader}>Filters</Text>

          {/* Cafeteria */}
          <Text style={styles.label}>Cafeteria</Text>
          {cafeterias.map((caf) => (
            <TouchableOpacity
              key={caf.id}
              onPress={() => setCafeteriaId(cafeteriaId === caf.id ? null : caf.id)}
            >
              <Text
                style={cafeteriaId === caf.id ? styles.active : styles.option}
              >
                {caf.cafeteria_name}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Concession */}
          <Text style={styles.label}>Concession</Text>
          {concessions
            .filter((c) => !cafeteriaId || c.cafeteria_id === cafeteriaId)
            .map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() =>
                  setConcessionId(concessionId === c.id ? null : c.id)
                }
              >
                <Text
                  style={concessionId === c.id ? styles.active : styles.option}
                >
                  {c.concession_name}
                </Text>
              </TouchableOpacity>
            ))}

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(category === cat ? null : cat)}
            >
              <Text style={category === cat ? styles.active : styles.option}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}

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

          {/* Close */}
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => setFiltersVisible(false)}
          >
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  filterBtn: {
    padding: 10,
    backgroundColor: "#A40C2D",
    margin: 10,
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
  price: { marginTop: 5, fontWeight: "600", color: "#A40C2D" },
  filterContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  filterHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
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
