// screens/Menu/ViewMenu.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../../libs/apiCall";

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
  const [note, setNote] = useState<string>("");
  const [diningOption, setDiningOption] = useState<'dine-in' | 'take-out'>("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'on-counter'>("on-counter");
  const [concessionDetails, setConcessionDetails] = useState<any | null>(null);

  // Helpers to normalize flags coming as boolean/number/string
  const toBool = (v: any): boolean => {
    if (v === true) return true;
    if (v === false) return false;
    if (v === 1 || v === '1') return true;
    if (v === 0 || v === '0') return false;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true' || s === 'yes' || s === 'y') return true;
      if (s === 'false' || s === 'no' || s === 'n') return false;
    }
    return !!v;
  };
  const readFlag = (obj: any, keys: string[]): boolean => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
        return toBool((obj as any)[k]);
      }
    }
    return false;
  };

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

  // Fetch concession details to mirror customer-side availability
  useEffect(() => {
    const fetchConcession = async () => {
      try {
        const cid = (menuItem as any)?.concession_id || (menuItem as any)?.concessionId;
        if (!cid) return;
        const res = await api.get(`/concession/${cid}`);
        setConcessionDetails(res.data?.data || res.data);
      } catch (err) {
        // fail silently; fallback to menuItem flags
        setConcessionDetails(null);
      }
    };
    fetchConcession();
  }, [menuItem?.concession_id]);

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

  // Payment availability (mirror customer behavior) with normalization and alias support
  const availablePaymentMethods = {
    gcash:
      readFlag(concessionDetails || {}, [
        'gcash_payment_available',
        'gcashPaymentAvailable',
        'gcash_available',
        'gcash',
        'enable_gcash',
        'accepts_gcash',
      ])
      || readFlag(menuItem, [
        'gcash_payment_available',
        'gcashPaymentAvailable',
        'gcash_available',
        'gcash',
        'enable_gcash',
        'accepts_gcash',
      ])
      || !!(concessionDetails as any)?.gcash_number
      || !!(menuItem as any)?.gcash_number, // fallback: gcash number present
    onCounter:
      readFlag(concessionDetails || {}, [
        'oncounter_payment_available',
        'onCounter_payment_available',
        'onCounterPaymentAvailable',
        'on_counter_payment_available',
        'on_counter',
        'onCounter',
        'oncounter',
        'enable_oncounter',
        'accepts_oncounter',
      ])
      || readFlag(menuItem, [
        'oncounter_payment_available',
        'onCounter_payment_available',
        'onCounterPaymentAvailable',
        'on_counter_payment_available',
        'on_counter',
        'onCounter',
        'oncounter',
        'enable_oncounter',
        'accepts_oncounter',
      ]),
  };

  // Set default payment method based on availability
  useEffect(() => {
    if (availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) {
      setPaymentMethod('gcash');
    } else if (!availablePaymentMethods.gcash && availablePaymentMethods.onCounter) {
      setPaymentMethod('on-counter');
    }
  }, [availablePaymentMethods.gcash, availablePaymentMethods.onCounter]);

  // Determine if payment availability data is known to avoid false 'No methods' message before fetch completes
  const paymentKnown = (
    concessionDetails !== null ||
    Object.prototype.hasOwnProperty.call(menuItem, 'gcash_payment_available') ||
    Object.prototype.hasOwnProperty.call(menuItem, 'oncounter_payment_available') ||
    Object.prototype.hasOwnProperty.call(menuItem, 'gcashPaymentAvailable') ||
    Object.prototype.hasOwnProperty.call(menuItem, 'onCounter_payment_available') ||
    Object.prototype.hasOwnProperty.call(menuItem, 'onCounterPaymentAvailable')
  );

  const toggleVariation = (gIndex: number, group: VariationGroup, vIndex: number, variation: Variation) => {
    const maxAmount = variation.max_amount || 1;
    const maxSelection = group.max_selection || 1;
    const groupId = gIndex; // use index as id for preview
    const uniqueId = `${gIndex}:${vIndex}`;

    const selectionsInGroup = selectedVariations.filter((v: SelectedVariation) => v.group_id === groupId);
    const isSelected = selectedVariations.some((v: SelectedVariation) => v.uniqueId === uniqueId);

    if (!isSelected) {
      if (maxSelection === 1 && selectionsInGroup.length > 0) {
        Alert.alert("Selection Limit", `You can only select 1 option from "${group.label}". Please deselect the current selection first.`);
        return;
      }
      if (selectionsInGroup.length >= maxSelection) {
        Alert.alert("Selection Limit", `You can only select up to ${maxSelection} option(s) from "${group.label}". Please deselect an option first.`);
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
        Alert.alert("Selection Limit", `You can only select 1 option from "${group.label}". Please deselect the current selection first.`);
        return;
      }
      if (selectionsInGroup.length >= maxSelection) {
        Alert.alert("Selection Limit", `You can only select up to ${maxSelection} option(s) from "${group.label}". Please deselect an option first.`);
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

  // Preview: mimic customer validations and alerts without API calls
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
        return Alert.alert("Missing Selection", `Please select at least one option from "${groupName}".`);
      }
      if (selectionsInGroup.length < minSelection) {
        return Alert.alert("Insufficient Selections", `Please select at least ${minSelection} option(s) from "${groupName}".`);
      }
      if (selectionsInGroup.length > maxSelection) {
        return Alert.alert("Too Many Selections", `You can only select up to ${maxSelection} option(s) from "${groupName}".`);
      }
    }

    // Validate payment method availability
    if (paymentMethod === 'gcash' && !availablePaymentMethods.gcash) {
      return Alert.alert("Payment Method Unavailable", "GCash payment is not available for this concession.");
    }
    if (paymentMethod === 'on-counter' && !availablePaymentMethods.onCounter) {
      return Alert.alert("Payment Method Unavailable", "On-counter payment is not available for this concession.");
    }

    // Success (no navigation in preview)
    Alert.alert("Success", inCart ? "Item added to cart!" : "Order placed successfully!");
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

      {/* Dining Option */}
      <View style={styles.diningOptionContainer}>
        <Text style={styles.diningOptionTitle}>Dining Option</Text>
        <View style={styles.diningOptionButtons}>
          <TouchableOpacity
            style={[styles.diningOptionButton, diningOption === 'dine-in' && styles.diningOptionSelected]}
            onPress={() => setDiningOption('dine-in')}
          >
            <Text style={[styles.diningOptionText, diningOption === 'dine-in' && styles.diningOptionTextSelected]}>🍽️ Dine In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diningOptionButton, diningOption === 'take-out' && styles.diningOptionSelected]}
            onPress={() => setDiningOption('take-out')}
          >
            <Text style={[styles.diningOptionText, diningOption === 'take-out' && styles.diningOptionTextSelected]}>📦 Take Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.paymentMethodContainer}>
        <Text style={styles.paymentMethodTitle}>Payment Method</Text>
        {(!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) ? (
          paymentKnown ? (
            <Text style={styles.noPaymentMethodsText}>⚠️ No payment methods are currently available for this concession.</Text>
          ) : null
        ) : (
          <>
            <View style={styles.paymentMethodButtons}>
              {availablePaymentMethods.gcash && (
                <TouchableOpacity
                  style={[styles.paymentMethodButton, paymentMethod === 'gcash' && styles.paymentMethodSelected]}
                  onPress={() => setPaymentMethod('gcash')}
                >
                  <Text style={[styles.paymentMethodText, paymentMethod === 'gcash' && styles.paymentMethodTextSelected]}>💳 GCash</Text>
                </TouchableOpacity>
              )}
              {availablePaymentMethods.onCounter && (
                <TouchableOpacity
                  style={[styles.paymentMethodButton, paymentMethod === 'on-counter' && styles.paymentMethodSelected]}
                  onPress={() => setPaymentMethod('on-counter')}
                >
                  <Text style={[styles.paymentMethodText, paymentMethod === 'on-counter' && styles.paymentMethodTextSelected]}>💰 On-Counter</Text>
                </TouchableOpacity>
              )}
            </View>
            {paymentMethod === 'gcash' && ((concessionDetails as any)?.gcash_number || (menuItem as any).gcash_number) && (
              <Text style={styles.gcashNumberText}>GCash Number: {(concessionDetails as any)?.gcash_number || (menuItem as any).gcash_number}</Text>
            )}
          </>
        )}
      </View>

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
                              Alert.alert("Selection Limit", `You can only select 1 option from "${group.label}". Please deselect the current selection first.`);
                            } else {
                              Alert.alert("Selection Limit", `You can only select up to ${maxSelection} option(s) from "${group.label}". Please deselect an option first.`);
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
        {/* Note */}
        <Text style={styles.noteLabel}>Add Note:</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="e.g. No onions, extra spicy..."
          value={note}
          onChangeText={setNote}
          multiline
        />

        {/* Buttons (preview) */}
        <TouchableOpacity 
          style={[styles.btn, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnDisabled]} 
          onPress={() => submitOrderPreview(true)} 
          disabled={!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter}
        >
          <Text style={[styles.btnText, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnTextDisabled]}>
            Add to Cart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btn, styles.btnAlt, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnDisabled]} 
          onPress={() => submitOrderPreview(false)} 
          disabled={!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter}
        >
          <Text style={[styles.btnText, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnTextDisabled]}>
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

  // Dining option (customer parity)
  diningOptionContainer: { marginBottom: 20 },
  diningOptionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  diningOptionButtons: { flexDirection: "row", gap: 10 },
  diningOptionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  diningOptionSelected: { borderColor: "#A40C2D", backgroundColor: "#A40C2D22" },
  diningOptionText: { fontSize: 14, fontWeight: "500", color: "#666" },
  diningOptionTextSelected: { color: "#A40C2D", fontWeight: "600" },

  // Payment method (customer parity)
  paymentMethodContainer: { marginBottom: 20 },
  paymentMethodTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  paymentMethodButtons: { flexDirection: "row", gap: 10 },
  paymentMethodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  paymentMethodSelected: { borderColor: "#A40C2D", backgroundColor: "#A40C2D22" },
  paymentMethodText: { fontSize: 14, fontWeight: "500", color: "#666" },
  paymentMethodTextSelected: { color: "#A40C2D", fontWeight: "600" },
  gcashNumberText: { fontSize: 12, color: "#666", marginTop: 8, textAlign: "center", fontStyle: "italic" },
  noPaymentMethodsText: {
    fontSize: 14,
    color: "#ff6b6b",
    textAlign: "center",
    fontStyle: "italic",
    padding: 10,
    backgroundColor: "#ffe0e0",
    borderRadius: 8,
  },

  // Note & Buttons (customer parity)
  noteLabel: { alignSelf: "flex-start", fontWeight: "600", marginTop: 12 },
  noteInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    marginTop: 6,
    marginBottom: 10,
  },
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
