import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";

const MenuItemDetails = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { item, concession, cafeteria } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [groupedVariations, setGroupedVariations] = useState<any>({});
  const [selectedVariations, setSelectedVariations] = useState<any[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Fetch variation groups + variations
  useEffect(() => {
    console.log(concession)
    const fetchVariations = async () => {
      try {
        const res = await api.get(`/item-variation-group/${item.id}`);
        const groups = res.data.data;

        const grouped: any = {};
        for (const g of groups) {
          const vRes = await api.get(`/item-variation/group/${g.id}`);
          grouped[g.variation_group_name] = {
            ...g,
            variations: vRes.data.data,
          };
        }
        setGroupedVariations(grouped);
      } catch (err) {
        console.error("Error fetching variations:", err);
      }
    };

    fetchVariations();
  }, [item.id]);

  // Price calculation
  const basePrice = Number(item.price) || 0;
  const variationTotal = selectedVariations.reduce(
    (sum, v) => sum + Number(v.additional_price || 0),
    0
  );
  const displayPrice = (basePrice + variationTotal) * quantity;

  // Handle variation selection
  const toggleVariation = (group: any, variation: any) => {
    const alreadySelected = selectedVariations.find((v) => v.id === variation.id);

    if (group.multiple_selection) {
      if (alreadySelected) {
        setSelectedVariations(selectedVariations.filter((v) => v.id !== variation.id));
      } else {
        setSelectedVariations([...selectedVariations, { ...variation, group_id: group.id }]);
      }
    } else {
      setSelectedVariations([
        ...selectedVariations.filter((v) => v.group_id !== group.id),
        { ...variation, group_id: group.id },
      ]);
    }
  };

  // Submit order/cart
  const submitOrder = async (inCart: boolean) => {
    try {
      setPlacingOrder(true);
      const user = useStore.getState().user;
      if (!user) return Alert.alert("Error", "You must be logged in to place an order.");

      // ✅ Validate required selections
      for (const [groupName, group] of Object.entries<any>(groupedVariations)) {
        if (group.required_selection) {
          const hasSelection = selectedVariations.some((v) => v.group_id === group.id);
          if (!hasSelection) {
            setPlacingOrder(false);
            return Alert.alert("Missing Selection", `Please select at least one option from "${groupName}".`);
          }
        }
      }

      // Create order
      const orderRes = await api.post("/order", {
        customer_id: user.id,
        concession_id: item.concession_id,
        order_status: inCart ? "cart" : "pending",
        note,
        total_price: 0,
        in_cart: inCart,
        payment_method: null,
      });

      const orderId = orderRes.data.id;

      const detailRes = await api.post("/order-detail", {
        order_id: orderId,
        item_id: item.id,
        quantity,
        item_price: item.price,
        total_price: displayPrice,
        note,
      });

      const orderDetailId = detailRes.data.id;

      for (const v of selectedVariations) {
        await api.post("/order-item-variation", {
          order_detail_id: orderDetailId,
          variation_id: v.id,
        });
      }

      await api.put(`/order/${orderId}/recalculate`);

      Alert.alert("Success", inCart ? "Item added to cart!" : "Order placed successfully!");
      navigation.navigate(inCart ? "Cart" : "Orders");
    } catch (err: any) {
      console.error(err.response?.data || err);
      Alert.alert("Error", err.response?.data?.message ?? "Failed to submit order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Item Header */}
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <Text style={styles.title}>{item.item_name}</Text>

      {/* Cafeteria + Concession */}
      <Text style={styles.subText}>
        {cafeteria?.cafeteria_name} •{" "}
        <Text
          style={styles.link}
          onPress={() =>
            navigation.navigate("View Concession", { concession, cafeteria })
          }
        >
          {concession?.concession_name}
        </Text>
      </Text>

      <Text style={styles.price}>₱{displayPrice.toFixed(2)}</Text>
      <Text style={styles.desc}>{item.description}</Text>

      {/* Variations */}
      {Object.entries<any>(groupedVariations).map(([groupName, group]) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupTitle}>
            {groupName}{" "}
            {group.required_selection && <Text style={styles.required}>*Required</Text>}
            {group.multiple_selection && (
              <Text style={styles.multiple}>(Multiple choices allowed)</Text>
            )}
          </Text>
          {group.variations.map((variation: any) => {
            const isSelected = selectedVariations.some((v) => v.id === variation.id);
            return (
              <TouchableOpacity
                key={variation.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => toggleVariation(group, variation)}
              >
                <Text>{variation.variation_name} (+₱{variation.additional_price})</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Quantity */}
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
          style={styles.qtyBtn}
        >
          <Text style={styles.qtyText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{quantity}</Text>
        <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
          <Text style={styles.qtyText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => submitOrder(true)}
        disabled={placingOrder}
      >
        <Text style={styles.btnText}>Add to Cart</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.btnAlt]}
        onPress={() => submitOrder(false)}
        disabled={placingOrder}
      >
        <Text style={styles.btnText}>Place Order</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#A40C2D" },
  subText: { fontSize: 14, color: "#555", marginBottom: 5 },
  link: { color: "#A40C2D", fontWeight: "600" },
  price: { fontSize: 18, color: "#333", marginVertical: 5 },
  desc: { fontSize: 14, color: "#666", marginBottom: 15 },
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  required: { color: "red", fontSize: 14 },
  multiple: { fontSize: 12, color: "#555", marginLeft: 5 },
  option: {
    padding: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    marginBottom: 6,
  },
  optionSelected: {
    backgroundColor: "#A40C2D33",
    borderWidth: 1,
    borderColor: "#A40C2D",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
  },
  qtyBtn: {
    padding: 10,
    backgroundColor: "#A40C2D",
    borderRadius: 6,
    marginHorizontal: 10,
  },
  qtyText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  qtyValue: { fontSize: 18, fontWeight: "600" },
  btn: {
    backgroundColor: "#A40C2D",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  btnAlt: { backgroundColor: "#444" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default MenuItemDetails;
