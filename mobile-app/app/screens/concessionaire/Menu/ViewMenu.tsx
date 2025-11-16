// screens/Menu/ViewMenu.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../../libs/apiCall";
import { useToast } from "../../../contexts/ToastContext";

type Variation = { name: string; price: string | number; image_url?: string; max_amount?: number; id?: number | string };
type VariationGroup = {
  label: string;
  variations: Variation[];
  required_selection: boolean;
  min_selection?: number;
  max_selection?: number;
};

type SelectedVariation = Variation & { group_id: number; uniqueId: string };

const ViewMenu: React.FC = () => {
  const route = useRoute<any>();
  const { menuItem } = route.params;

  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>(menuItem?.variations || []);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedVariations, setSelectedVariations] = useState<SelectedVariation[]>([]);
  const [variationQuantities, setVariationQuantities] = useState<Record<string, number>>({});
  const { showToast } = useToast();

  // Fetch feedbacks
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await api.get(`/feedback/${menuItem.id}`);
        setFeedbacks(res.data);
      } catch (err: any) {
        console.log("No feedback found", err.response?.data?.message || "");
        setFeedbacks([]);
      }
    };

    fetchFeedbacks();
  }, [menuItem.id]);

  // Helpers for preview selection logic
  const basePrice = Number(menuItem.price) || 0;
  const variationTotal = useMemo(() => {
    let sum = 0;
    for (const [key, qty] of Object.entries(variationQuantities) as [string, number][]) {
      const [gIndexStr, vIndexStr] = key.split(":");
      const g = variationGroups[Number(gIndexStr)];
      const v = g?.variations[Number(vIndexStr)];
      if (!v) continue;
      const qNum = Number(qty || 0);
      sum += (Number(v.price || 0) * qNum);
    }
    // also include selected variations with max_amount === 1
    for (const v of selectedVariations as SelectedVariation[]) {
      sum += Number(v.price || 0);
    }
    return sum;
  }, [variationQuantities, selectedVariations, variationGroups]);

  const displayPrice = (basePrice + variationTotal) * quantity;

  const toggleVariation = (gIndex: number, group: VariationGroup, vIndex: number, variation: Variation) => {
    const maxAmount = variation.max_amount || 1;
    const maxSelection = group.max_selection || 1;
    const groupId = gIndex; // use index as id for preview
    const uniqueId = `${gIndex}:${vIndex}`;

    const selectionsInGroup = selectedVariations.filter((v: SelectedVariation) => v.group_id === groupId);
    const isSelected = selectedVariations.some((v: SelectedVariation) => v.uniqueId === uniqueId);

    if (!isSelected) {
      if (maxSelection === 1 && selectionsInGroup.length > 0) {
        showToast(
          "error",
          `You can only select 1 option from "${group.label}". Please deselect the current selection first.`,
        );
        return;
      }
      if (selectionsInGroup.length >= maxSelection) {
        showToast(
          "error",
          `You can only select up to ${maxSelection} option(s) from "${group.label}". Please deselect an option first.`,
        );
        return;
      }
    }

    if (maxAmount > 1) {
      const currentQty = variationQuantities[uniqueId] || 0;
      if (currentQty > 0) {
        const newQuantities = { ...variationQuantities };
        delete newQuantities[uniqueId];
        setVariationQuantities(newQuantities);
        setSelectedVariations(selectedVariations.filter((v: SelectedVariation) => v.uniqueId !== uniqueId));
      } else {
        setVariationQuantities({ ...variationQuantities, [uniqueId]: 1 });
        setSelectedVariations([...selectedVariations, { ...variation, group_id: groupId, uniqueId }]);
      }
      return;
    }

    if (isSelected) {
      setSelectedVariations(selectedVariations.filter((v: SelectedVariation) => v.uniqueId !== uniqueId));
    } else {
      if (maxSelection > 1) {
        setSelectedVariations([...selectedVariations, { ...variation, group_id: groupId, uniqueId }]);
      } else {
        setSelectedVariations([
          ...selectedVariations.filter((v: SelectedVariation) => v.group_id !== groupId),
          { ...variation, group_id: groupId, uniqueId },
        ]);
      }
    }
  };

  const updateVariationQuantity = (gIndex: number, vIndex: number, variation: Variation, delta: number) => {
    const key = `${gIndex}:${vIndex}`;
    const currentQty = variationQuantities[key] || 0;
    const maxAmount = variation.max_amount || 1;
    const group = variationGroups[gIndex];
    if (!group) return;
    const maxSelection = group.max_selection || 1;
    const selectionsInGroup = selectedVariations.filter((v: SelectedVariation) => v.group_id === gIndex);

    if (delta > 0 && currentQty === 0) {
      if (maxSelection === 1 && selectionsInGroup.length > 0) {
        showToast(
          "error",
          `You can only select 1 option from "${group.label}". Please deselect the current selection first.`,
        );
        return;
      }
      if (selectionsInGroup.length >= maxSelection) {
        showToast(
          "error",
          `You can only select up to ${maxSelection} option(s) from "${group.label}". Please deselect an option first.`,
        );
        return;
      }
    }

    const newQty = Math.max(0, Math.min(maxAmount, currentQty + delta));
    if (newQty === 0) {
      const newQuantities = { ...variationQuantities };
      delete newQuantities[key];
      setVariationQuantities(newQuantities);
      setSelectedVariations(selectedVariations.filter((v: SelectedVariation) => v.uniqueId !== key));
    } else {
      setVariationQuantities({ ...variationQuantities, [key]: newQty });
      if (!selectedVariations.find((v: SelectedVariation) => v.uniqueId === key)) {
        setSelectedVariations([...selectedVariations, { ...variation, group_id: gIndex, uniqueId: key }]);
      }
    }
  };

  const changeQuantity = (delta: number) => {
    setQuantity((q: number) => Math.max(1, q + delta));
  };

  const submitOrderPreview = (inCart: boolean) => {
    // Validate required selections, min_selection, and max_selection
    for (let gIndex = 0; gIndex < variationGroups.length; gIndex++) {
      const group = variationGroups[gIndex];
      const groupName = group.label;
      const selectionsInGroup = selectedVariations.filter((v: SelectedVariation) => v.group_id === gIndex);
      const minSelection = group.min_selection || 0;
      const maxSelection = group.max_selection || 1;
      const requiredSelection = group.required_selection || false;

      if (requiredSelection && selectionsInGroup.length === 0) {
        showToast("error", `Please select at least one option from "${groupName}".`);
        return;
      }
      if (selectionsInGroup.length < minSelection) {
        showToast("error", `Please select at least ${minSelection} option(s) from "${groupName}".`);
        return;
      }
      if (selectionsInGroup.length > maxSelection) {
        showToast("error", `You can only select up to ${maxSelection} option(s) from "${groupName}".`);
        return;
      }
    }
    showToast("success", inCart ? "Item added to cart!" : "Order placed successfully!");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Item Details */}
      {menuItem.image_url && (
        <Image source={{ uri: menuItem.image_url }} style={styles.image} />
      )}
      <Text style={styles.title}>{menuItem.item_name}</Text>

      {menuItem.category && (
        <>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{menuItem.category}</Text>
        </>
      )}

      <View style={styles.priceQtyWrapper}>
        <Text style={styles.price}>₱{Number(displayPrice || 0).toFixed(2)}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
            <Text style={styles.qtyText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
            <Text style={styles.qtyText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      {(menuItem as any).description ? (
        <Text style={styles.desc}>{(menuItem as any).description}</Text>
      ) : null}

      <Text style={styles.label}>Availability</Text>
      <Text style={[styles.value, { color: menuItem.availability ? "green" : "red" }]}>
        {menuItem.availability ? "Available" : "Unavailable"}
      </Text>

      {/* Variations - Interactive Preview */}
      {variationGroups.length > 0 && (
        <>
          <Text style={styles.label}>Variations</Text>
          {variationGroups.map((group: VariationGroup, gIndex: number) => {
            const selectionsInGroup = selectedVariations.filter((v: SelectedVariation) => v.group_id === gIndex);
            const maxSelection = group.max_selection || 1;
            const isMaxSelectionReached = selectionsInGroup.length >= maxSelection;
            return (
              <View key={gIndex} style={styles.group}>
                <Text style={styles.groupTitle}>
                  {group.label} {group.required_selection ? <Text style={styles.required}>*Required</Text> : null}
                </Text>
                {maxSelection > 1 && (
                  <Text style={styles.selectionCounter}>Selected: {selectionsInGroup.length} / {maxSelection}</Text>
                )}
                {group.variations.map((variation: Variation, vIndex: number) => {
                  const maxAmount = variation.max_amount || 1;
                  const key = `${gIndex}:${vIndex}`;
                  const qty = variationQuantities[key] || 0;
                  const showQty = maxAmount > 1;
                  const isSelected = showQty ? qty > 0 : selectedVariations.some((v: SelectedVariation) => v.uniqueId === key);
                  let isUnclickable = false;
                  if (!isSelected) {
                    if (maxSelection === 1 && selectionsInGroup.length > 0) isUnclickable = true;
                    else if (isMaxSelectionReached) isUnclickable = true;
                  }
                  return (
                    <View key={key} style={[styles.option, isSelected && styles.optionSelected]}>
                      <TouchableOpacity
                        style={styles.variationContent}
                        onPress={() => {
                          if (showQty) return;
                          if (isUnclickable) {
                            if (maxSelection === 1) {
                              showToast(
                                "error",
                                `You can only select 1 option from "${group.label}". Please deselect the current selection first.`,
                              );
                            } else {
                              showToast(
                                "error",
                                `You can only select up to ${maxSelection} option(s) from "${group.label}". Please deselect an option first.`,
                              );
                            }
                            return;
                          }
                          toggleVariation(gIndex, group, vIndex, variation);
                        }}
                        disabled={showQty}
                      >
                        {variation.image_url ? (
                          <Image source={{ uri: variation.image_url }} style={styles.variationImage} />
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.variationName}>{variation.name}</Text>
                          <Text style={styles.variationPrice}>₱ {Number(variation.price || 0).toFixed(2)}</Text>
                        </View>
                      </TouchableOpacity>
                      {showQty ? (
                        <View style={styles.variationQuantityContainer}>
                          <TouchableOpacity style={styles.variationQtyButton} onPress={() => updateVariationQuantity(gIndex, vIndex, variation, -1)}>
                            <Text style={styles.variationQtyButtonText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.variationQtyValue}>{qty}</Text>
                          <TouchableOpacity style={styles.variationQtyButton} onPress={() => updateVariationQuantity(gIndex, vIndex, variation, 1)}>
                            <Text style={styles.variationQtyButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </>
      )}

      {/* Preview Footer - Quantity and Buttons */}
      <View style={styles.previewFooter}>
        <TouchableOpacity 
          style={styles.btn}
          onPress={() => submitOrderPreview(true)} 
        >
          <Text style={styles.btnText}>
            Add to Cart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btn, styles.btnAlt]}
          onPress={() => submitOrderPreview(false)} 
        >
          <Text style={styles.btnText}>
            Place Order
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feedback Section */}
      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackTitle}>Customer Feedback</Text>
        {feedbacks.length === 0 ? (
          <Text style={styles.noFeedback}>No feedback yet.</Text>
        ) : (
          feedbacks.map((fb: any) => (
            <View key={fb.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                {fb.profile_image ? (
                  <Image source={{ uri: fb.profile_image }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Text style={styles.profileInitials}>
                      {fb.first_name?.[0]}{fb.last_name?.[0]}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedbackUser}>{fb.first_name} {fb.last_name}</Text>
                  <Text style={styles.feedbackRating}>⭐ {fb.rating}</Text>
                </View>
              </View>
              {fb.comment && <Text style={styles.feedbackComment}>{fb.comment}</Text>}
              <Text style={styles.feedbackDate}>{new Date(fb.created_at).toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ViewMenu;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#A40C2D", marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12 },
  value: { fontSize: 16, marginTop: 4, color: "#333" },
  estimationValue: { marginTop: 5, fontWeight: "600", color: "#A40C2D" },

  // Price + Quantity header (customer parity)
  priceQtyWrapper: { alignItems: "flex-start", marginVertical: 10 },
  price: { fontSize: 20, fontWeight: "bold", color: "#A40C2D", marginBottom: 5 },
  quantityContainer: { flexDirection: "row", alignItems: "center" },
  qtyBtn: { padding: 6, backgroundColor: "#A40C2D", borderRadius: 6, marginHorizontal: 8 },
  qtyText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  qtyValue: { fontSize: 16, fontWeight: "600" },
  desc: { fontSize: 14, color: "#666", marginBottom: 15 },

  group: { marginBottom: 20 },
  groupLabel: { fontWeight: "600", fontSize: 14, marginBottom: 6 },
  optionText: { fontSize: 13, color: "#555", marginBottom: 4 },
  variationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  variationName: { fontSize: 13, color: "#333", flex: 1, marginLeft: 8 },
  variationPrice: { fontSize: 13, color: "darkred", fontWeight: "500" },
  variationImage: { width: 32, height: 32, borderRadius: 4 },

  // Interactive preview extras
  groupTitle: { fontWeight: "600", fontSize: 14, marginBottom: 6 },
  required: { color: "#A40C2D" },
  selectionCounter: { fontSize: 12, color: "#555", marginBottom: 6 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  optionSelected: { borderColor: "#A40C2D", backgroundColor: "#fff6f7" },
  variationContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  variationQuantityContainer: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  variationQtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  variationQtyButtonText: { fontSize: 16, fontWeight: "700", color: "#333" },
  variationQtyValue: { minWidth: 24, textAlign: "center", marginHorizontal: 8, fontWeight: "600" },
  previewFooter: { marginTop: 16, alignItems: "center" },
  itemQtyRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  qtyBtnLg: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eee", alignItems: "center", justifyContent: "center" },
  itemQtyValue: { minWidth: 32, textAlign: "center", marginHorizontal: 10, fontWeight: "700" },
  totalLabel: { marginTop: 8, color: "#555" },
  totalValue: { fontSize: 18, fontWeight: "700", color: "#A40C2D", marginTop: 2 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#ddd" },
  secondaryBtnText: { color: "#333", fontWeight: "600" },
  primaryBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#A40C2D" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  btn: { width: "100%", backgroundColor: "#A40C2D", padding: 12, borderRadius: 8, marginTop: 6, alignItems: "center" },
  btnAlt: { backgroundColor: "#333" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "bold" },
  btnTextDisabled: { color: "#eee" },

  feedbackContainer: { marginTop: 20 },
  feedbackTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  noFeedback: { color: "#888", fontStyle: "italic" },
  feedbackCard: { backgroundColor: "#f9f9f9", padding: 10, borderRadius: 6, marginBottom: 10 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  profilePlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc", alignItems: "center", justifyContent: "center", marginRight: 10 },
  profileInitials: { color: "#fff", fontWeight: "bold" },
  feedbackUser: { fontWeight: "600" },
  feedbackRating: { color: "#A40C2D" },
  feedbackComment: { color: "#333", marginVertical: 3 },
  feedbackDate: { fontSize: 12, color: "#888" },
});
