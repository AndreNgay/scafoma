import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../libs/apiCall";

const ViewConcession = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params as any) || {};
  const [details, setDetails] = useState<any>(params.concession || null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const cafeteria = params.cafeteria;
  const [search, setSearch] = useState("");

  useEffect(() => {
    // If a new concession param arrives, sync local state
    if (params.concession && (!details || details?.id !== params.concession.id)) {
      setDetails(params.concession);
    }

    const load = async () => {
      try {
        const id = params.concession?.id || details?.id;
        if (id) {
          const res = await api.get(`/concession/${id}`);
          setDetails(res.data.data || res.data);
        }
      } catch (e) {
        // no-op: keep whatever we have
      }
    };
    load();
  }, [params.concession?.id]);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const id = details?.id || params.concession?.id;
        if (!id) return;
        const res = await api.get(`/menu-item/all`, { params: { concessionId: id, limit: 100 } });
        setMenuItems(res.data.data || []);
      } catch (e) {
        setMenuItems([]);
      }
    };
    loadItems();
  }, [details?.id, params.concession?.id]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter((it: any) =>
      (it.item_name || "").toLowerCase().includes(q) ||
      (it.category || "").toLowerCase().includes(q)
    );
  }, [menuItems, search]);

  const itemsByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const it of filteredItems) {
      const cat = it.category || "Others";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    }
    return Object.entries(groups).map(([category, items]) => ({ category, items }));
  }, [filteredItems]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Header image */}
      {!!details?.image_url && <Image source={{ uri: details.image_url }} style={styles.image} />}
      {!details?.image_url && <View style={[styles.image, styles.imagePlaceholder]} />}

      {/* Concession Info */}
      <Text style={styles.concessionName}>{details?.concession_name || "Concession"}</Text>
      <Text style={styles.subText}>
        {(cafeteria?.cafeteria_name || details?.cafeteria_name || "").trim()} {details?.location ? `• ${details.location}` : ""}
      </Text>

      {/* Status */}
      {details?.status && (
        <View style={[styles.statusBadge, details.status === "open" ? styles.open : styles.closed]}>
          <Text style={styles.statusText}>{details.status.toUpperCase()}</Text>
        </View>
      )}

      {/* Payment Methods */}
      <Text style={styles.sectionHeader}>Available Payments</Text>
      {details?.gcash_payment_available && (
        <Text style={styles.paymentText}>
          ✅ GCash {details?.gcash_number ? `(${details.gcash_number})` : ""}
        </Text>
      )}
      {details?.oncounter_payment_available && (
        <Text style={styles.paymentText}>✅ On-Counter</Text>
      )}

      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search menu items..."
        style={styles.searchInput}
      />

      {/* Menu Items by Category */}
      {itemsByCategory.map(({ category, items }) => (
        <View key={category} style={{ marginTop: 10 }}>
          <Text style={styles.sectionHeader}>{category}</Text>
          {items.map((item: any) => {
            const available = Boolean(item.availability);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, !available && styles.itemDisabled]}
                onPress={() => available && navigation.navigate("Menu Item Details", { item, concession: details, cafeteria })}
                disabled={!available}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePlaceholder]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.item_name}</Text>
                  <Text style={styles.itemSub}>{item.category || "General"}</Text>
                  <Text style={styles.itemPrice}>₱{Number(item.price).toFixed(2)}</Text>
                </View>
                {!available && (
                  <View style={styles.unavailableBadge}>
                    <Text style={styles.unavailableText}>Unavailable</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  imagePlaceholder: { backgroundColor: "#eee" },
  concessionName: { fontSize: 20, fontWeight: "bold", color: "#A40C2D" },
  subText: { fontSize: 14, color: "#555", marginTop: 3 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  statusText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  open: { backgroundColor: "#16a34a" },
  closed: { backgroundColor: "#9ca3af" },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    color: "#A40C2D",
  },
  paymentText: { fontSize: 14, marginBottom: 5 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
    padding: 10,
    marginBottom: 10,
  },
  itemDisabled: { opacity: 0.5 },
  itemImage: { width: 72, height: 72, borderRadius: 8, marginRight: 10 },
  itemImagePlaceholder: { backgroundColor: "#eee" },
  itemTitle: { fontWeight: "700" },
  itemSub: { color: "#666", marginTop: 2 },
  itemPrice: { marginTop: 6, fontWeight: "700", color: "#A40C2D" },
  unavailableBadge: { alignSelf: "center", backgroundColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  unavailableText: { color: "#6b7280", fontWeight: "600", fontSize: 12 },
});

export default ViewConcession;
