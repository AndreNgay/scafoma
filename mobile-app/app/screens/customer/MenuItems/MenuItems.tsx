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
  TextInput,
} from "react-native";
import api from "../../../libs/apiCall"; // axios instance
import { useNavigation } from "@react-navigation/native";



const MenuItems = () => {
  // data
  const [menuItems, setMenuItems] = useState<any[]>([]);
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

      // Backend supports single values; use the first selected for server-side narrowing when available
      const res = await api.get<{ data: any[] }>("/menu-item/all", {
        params: {
          cafeteriaId: cafeteriaIds.length === 1 ? cafeteriaIds[0] : undefined,
          concessionId: concessionIds.length === 1 ? concessionIds[0] : undefined,
          category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
          sortBy,
          search: searchQuery,
        },
      });

      const items = res.data.data as {
        id: number;
        item_name: string;
        concession_name: string;
        concession_id: number;
        cafeteria_name: string;
        price: number;
        category?: string;
        image_url?: string;
      }[];

      // client-side filtering for multi-select
      const filtered = items.filter((it) => {
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

      setMenuItems(filtered);

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
  }, [cafeteriaIds, concessionIds, selectedCategories, sortBy, searchQuery]);

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
        <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
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
    margin: 10,
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
