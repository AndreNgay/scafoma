import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";

const MenuItemDetails = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { item, concession, cafeteria, cafeteriaName } = route.params as any;

  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [diningOption, setDiningOption] = useState<'dine-in' | 'take-out'>('dine-in');
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'on-counter'>('on-counter');
  const [groupedVariations, setGroupedVariations] = useState<any>({});
  const [selectedVariations, setSelectedVariations] = useState<any[]>([]);
  // Track quantities for variations with max_amount > 1
  const [variationQuantities, setVariationQuantities] = useState<Record<number, number>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [canLeaveFeedback, setCanLeaveFeedback] = useState<boolean>(false);
  const [eligibilityChecked, setEligibilityChecked] = useState<boolean>(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const user = useStore.getState().user;

  // Determine available payment methods
  const availablePaymentMethods = {
    gcash: item.gcash_payment_available || false,
    onCounter: item.oncounter_payment_available || false,
  };

  // Set default payment method based on availability
  useEffect(() => {
    if (!availablePaymentMethods.gcash && availablePaymentMethods.onCounter) {
      setPaymentMethod('on-counter');
    } else if (availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) {
      setPaymentMethod('gcash');
    }
  }, [availablePaymentMethods]);

  // Fetch variations + feedbacks + feedback eligibility
  useEffect(() => {
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

    const fetchFeedbacks = async () => {
      try {
        const res = await api.get(`/feedback/${item.id}`);
        setFeedbacks(res.data);
      } catch (err: any) {
        console.log("No feedback found", err.response?.data?.message || "");
        setFeedbacks([]);
      }
    };

    const checkEligibility = async () => {
      try {
        if (!user?.id) return;
        const res = await api.get(`/feedback/can-leave/${item.id}/${user.id}`);
        setCanLeaveFeedback(!!res.data?.canLeave);
      } catch (err) {
        console.error("Error checking feedback eligibility:", err);
        setCanLeaveFeedback(false);
      } finally {
        setEligibilityChecked(true);
      }
    };

    fetchVariations();
    fetchFeedbacks();
    checkEligibility();
  }, [item.id, user?.id]);

  const submitFeedback = async () => {
    try {
      if (!user?.id) return Alert.alert("Error", "You must be logged in to leave feedback.");
      if (!canLeaveFeedback) return Alert.alert("Not eligible", "You can only leave feedback after completing an order for this item.");
      if (feedbackRating < 1 || feedbackRating > 5) return Alert.alert("Invalid Rating", "Please select a rating between 1 and 5.");
      setSubmittingFeedback(true);
      await api.post(`/feedback`, {
        customer_id: user.id,
        menu_item_id: item.id,
        rating: feedbackRating,
        comment: feedbackComment || null,
      });
      setFeedbackModalVisible(false);
      setFeedbackComment("");
      setFeedbackRating(5);
      // refresh feedback list
      try {
        const res = await api.get(`/feedback/${item.id}`);
        setFeedbacks(res.data);
      } catch {}
      Alert.alert("Thank you!", "Your feedback has been submitted.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to submit feedback.";
      Alert.alert("Error", msg);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Price calculation
  const basePrice = Number(item.price) || 0;
  const variationTotal = selectedVariations.reduce((sum, v) => {
    const qty = variationQuantities[v.id] || 1;
    return sum + (Number(v.additional_price || 0) * qty);
  }, 0);
  const displayPrice = (basePrice + variationTotal) * quantity;

  // Handle variation selection
  const toggleVariation = (group: any, variation: any) => {
    const maxAmount = variation.max_amount || 1;
    const maxSelection = group.max_selection || 1;
    const selectionsInGroup = selectedVariations.filter((v) => v.group_id === group.id);
    const isSelected = selectedVariations.some((v) => v.id === variation.id);
    
    // Check if selection should be blocked
    if (!isSelected) {
      // If max_selection is 1, and another variation is already selected, show message
      if (maxSelection === 1 && selectionsInGroup.length > 0) {
        Alert.alert(
          "Selection Limit",
          `You can only select 1 option from "${group.variation_group_name}". Please deselect the current selection first.`
        );
        return;
      }
      // If max_selection is reached, show message
      if (selectionsInGroup.length >= maxSelection) {
        Alert.alert(
          "Selection Limit",
          `You can only select up to ${maxSelection} option(s) from "${group.variation_group_name}". Please deselect an option first.`
        );
        return;
      }
    }
    
    // If max_amount > 1, use quantity-based selection
    if (maxAmount > 1) {
      const currentQty = variationQuantities[variation.id] || 0;
      if (currentQty > 0) {
        // Remove variation if quantity is being set to 0
        const newQuantities = { ...variationQuantities };
        delete newQuantities[variation.id];
        setVariationQuantities(newQuantities);
        setSelectedVariations(selectedVariations.filter((v) => v.id !== variation.id));
      } else {
        // Add variation with quantity 1
        setVariationQuantities({ ...variationQuantities, [variation.id]: 1 });
        setSelectedVariations([...selectedVariations, { ...variation, group_id: group.id }]);
      }
      return;
    }
    
    // For max_amount = 1, use the old toggle logic
    const alreadySelected = selectedVariations.find((v) => v.id === variation.id);
    
    if (maxSelection > 1) {
      // Multiple selection allowed up to max_selection
      if (alreadySelected) {
        setSelectedVariations(selectedVariations.filter((v) => v.id !== variation.id));
      } else {
        setSelectedVariations([...selectedVariations, { ...variation, group_id: group.id }]);
      }
    } else {
      // Single selection only
      setSelectedVariations([
        ...selectedVariations.filter((v) => v.group_id !== group.id),
        { ...variation, group_id: group.id },
      ]);
    }
  };

  // Handle variation quantity changes (for max_amount > 1)
  const updateVariationQuantity = (variation: any, delta: number) => {
    const currentQty = variationQuantities[variation.id] || 0;
    const maxAmount = variation.max_amount || 1;
    
    // Find the group this variation belongs to
    const group = Object.values(groupedVariations).find((g: any) => 
      g.variations.some((v: any) => v.id === variation.id)
    ) as any;
    
    if (!group) return;
    
    const maxSelection = group.max_selection || 1;
    const selectionsInGroup = selectedVariations.filter((v) => v.group_id === group.id);
    
    // Check if trying to add when max_selection is reached
    if (delta > 0 && currentQty === 0) {
      // Trying to add a new variation
      if (maxSelection === 1 && selectionsInGroup.length > 0) {
        Alert.alert(
          "Selection Limit",
          `You can only select 1 option from "${group.variation_group_name}". Please deselect the current selection first.`
        );
        return;
      }
      if (selectionsInGroup.length >= maxSelection) {
        Alert.alert(
          "Selection Limit",
          `You can only select up to ${maxSelection} option(s) from "${group.variation_group_name}". Please deselect an option first.`
        );
        return;
      }
    }
    
    const newQty = Math.max(0, Math.min(maxAmount, currentQty + delta));
    
    if (newQty === 0) {
      // Remove variation
      const newQuantities = { ...variationQuantities };
      delete newQuantities[variation.id];
      setVariationQuantities(newQuantities);
      setSelectedVariations(selectedVariations.filter((v) => v.id !== variation.id));
    } else {
      // Update quantity
      setVariationQuantities({ ...variationQuantities, [variation.id]: newQty });
      // Ensure variation is in selectedVariations
      if (!selectedVariations.find((v) => v.id === variation.id)) {
        setSelectedVariations([...selectedVariations, { ...variation, group_id: group.id }]);
      }
    }
  };

  // Submit order/cart
  const submitOrder = async (inCart: boolean) => {
    try {
      setPlacingOrder(true);
      if (!user) return Alert.alert("Error", "You must be logged in to place an order.");

      // Validate required selections, min_selection, and max_selection
      for (const [groupName, group] of Object.entries<any>(groupedVariations)) {
        const selectionsInGroup = selectedVariations.filter((v) => v.group_id === group.id);
        const minSelection = group.min_selection || 0;
        const maxSelection = group.max_selection || 1;
        const requiredSelection = group.required_selection || false;
        
        // Check required selection
        if (requiredSelection && selectionsInGroup.length === 0) {
          setPlacingOrder(false);
          return Alert.alert("Missing Selection", `Please select at least one option from "${groupName}".`);
        }
        
        // Check min_selection
        if (selectionsInGroup.length < minSelection) {
          setPlacingOrder(false);
          return Alert.alert("Insufficient Selections", `Please select at least ${minSelection} option(s) from "${groupName}".`);
        }
        
        // Check max_selection limit
        if (selectionsInGroup.length > maxSelection) {
          setPlacingOrder(false);
          return Alert.alert("Too Many Selections", `You can only select up to ${maxSelection} option(s) from "${groupName}".`);
        }
      }

      // Validate payment method availability
      if (paymentMethod === 'gcash' && !availablePaymentMethods.gcash) {
        setPlacingOrder(false);
        return Alert.alert("Payment Method Unavailable", "GCash payment is not available for this concession.");
      }
      if (paymentMethod === 'on-counter' && !availablePaymentMethods.onCounter) {
        setPlacingOrder(false);
        return Alert.alert("Payment Method Unavailable", "On-counter payment is not available for this concession.");
      }

      // Create order
      const orderRes = await api.post("/order", {
        customer_id: user.id,
        concession_id: item.concession_id,
        dining_option: diningOption,
        order_status: inCart ? "cart" : "pending",
        total_price: 0,
        in_cart: inCart,
        payment_method: paymentMethod,
      });

      const orderId = orderRes.data.id;

      // Add order detail
      const detailRes = await api.post("/order-detail", {
        order_id: orderId,
        item_id: item.id,
        quantity,
        item_price: item.price,
        total_price: displayPrice,
        note,
      });

      const orderDetailId = detailRes.data.id;

      // Add variations (send quantity once per variation)
      for (const v of selectedVariations) {
        const qty = variationQuantities[v.id] || 1;
        await api.post("/order-item-variation", {
          order_detail_id: orderDetailId,
          variation_id: v.id,
          quantity: qty,
        });
      }

      await api.put(`/order/${orderId}/recalculate`);

      // Notify concessionaire for direct order placement (not via cart checkout)
      if (!inCart) {
        try {
          await api.post(`/order/${orderId}/notify`);
        } catch (notifyErr) {
          console.error('Failed to notify concessionaire:', notifyErr);
        }
      }

      Alert.alert("Success", inCart ? "Item added to cart!" : "Order placed successfully!");
      if (inCart) {
        navigation.navigate("Cart");
      } else {
        // Redirect directly to the newly created order details
        (navigation as any).navigate("Orders", { screen: "View Order", params: { orderId } });
      }
    } catch (err: any) {
      console.error(err.response?.data || err);
      Alert.alert("Error", err.response?.data?.message ?? "Failed to submit order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Item Header */}
        <Image source={{ uri: item.image_url }} style={styles.image} />
        <Text style={styles.title}>{item.item_name}</Text>

        {/* Cafeteria + Concession */}
        <Text style={styles.subText}>
          {cafeteria?.cafeteria_name || cafeteriaName || item?.cafeteria_name}
          {" "}•{" "}
          {concession ? (
            <Text
              style={styles.link}
              onPress={() =>
                navigation.navigate("View Concession", {
                  concession,
                  cafeteria,
                })
              }
            >
              {concession?.concession_name}
            </Text>
          ) : (
            <Text style={styles.link}>{item?.concession_name || ""}</Text>
          )}
        </Text>

        {/* Price & Quantity */}
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

        <Text style={styles.desc}>{item.description}</Text>

        {/* Dining Option */}
        <View style={styles.diningOptionContainer}>
          <Text style={styles.diningOptionTitle}>Dining Option</Text>
          <View style={styles.diningOptionButtons}>
            <TouchableOpacity
              style={[
                styles.diningOptionButton,
                diningOption === 'dine-in' && styles.diningOptionSelected
              ]}
              onPress={() => setDiningOption('dine-in')}
            >
              <Text style={[
                styles.diningOptionText,
                diningOption === 'dine-in' && styles.diningOptionTextSelected
              ]}>
                🍽️ Dine In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.diningOptionButton,
                diningOption === 'take-out' && styles.diningOptionSelected
              ]}
              onPress={() => setDiningOption('take-out')}
            >
              <Text style={[
                styles.diningOptionText,
                diningOption === 'take-out' && styles.diningOptionTextSelected
              ]}>
                📦 Take Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentMethodContainer}>
          <Text style={styles.paymentMethodTitle}>Payment Method</Text>
          {!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter ? (
            <Text style={styles.noPaymentMethodsText}>
              ⚠️ No payment methods are currently available for this concession.
            </Text>
          ) : (
            <>
              <View style={styles.paymentMethodButtons}>
                {availablePaymentMethods.gcash && (
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === 'gcash' && styles.paymentMethodSelected
                    ]}
                    onPress={() => setPaymentMethod('gcash')}
                  >
                    <Text style={[
                      styles.paymentMethodText,
                      paymentMethod === 'gcash' && styles.paymentMethodTextSelected
                    ]}>
                      💳 GCash
                    </Text>
                  </TouchableOpacity>
                )}
                {availablePaymentMethods.onCounter && (
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === 'on-counter' && styles.paymentMethodSelected
                    ]}
                    onPress={() => setPaymentMethod('on-counter')}
                  >
                    <Text style={[
                      styles.paymentMethodText,
                      paymentMethod === 'on-counter' && styles.paymentMethodTextSelected
                    ]}>
                      💰 On-Counter
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {paymentMethod === 'gcash' && item.gcash_number && (
                <Text style={styles.gcashNumberText}>
                  GCash Number: {item.gcash_number}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Variations */}
        {Object.entries<any>(groupedVariations).map(([groupName, group]) => {
          const selectionsInGroup = selectedVariations.filter((v) => v.group_id === group.id);
          const maxSelection = group.max_selection || 1;
          const minSelection = group.min_selection || 0;
          
          // Determine if variations should be disabled
          const isMaxSelectionReached = selectionsInGroup.length >= maxSelection;
          
          return (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupTitle}>
                {groupName}{" "}
                {group.required_selection && <Text style={styles.required}>*Required</Text>}
              </Text>
              {maxSelection > 1 && (
                <Text style={styles.selectionCounter}>
                  Selected: {selectionsInGroup.length} / {maxSelection}
                </Text>
              )}
            {group.variations.map((variation: any) => {
              const maxAmount = variation.max_amount || 1;
              const variationQty = variationQuantities[variation.id] || 0;
              const showQuantityControls = maxAmount > 1;
              const isSelected = showQuantityControls ? variationQty > 0 : selectedVariations.some((v) => v.id === variation.id);
              
              // Determine if this variation should be unclickable (but not visually disabled)
              let isUnclickable = false;
              if (!isSelected) {
                // If max_selection is 1, make unselected variations unclickable when any is selected
                if (maxSelection === 1 && selectionsInGroup.length > 0) {
                  isUnclickable = true;
                }
                // If max_selection is reached, make all unselected variations unclickable
                else if (isMaxSelectionReached) {
                  isUnclickable = true;
                }
              }
              
              // Use composite key to ensure uniqueness across groups
              const uniqueKey = `${group.id}-${variation.id}`;
              
              return (
                <View key={uniqueKey} style={[styles.option, isSelected && styles.optionSelected]}>
                  <TouchableOpacity
                    style={styles.variationContent}
                    onPress={() => {
                      if (showQuantityControls) return;
                      if (isUnclickable) {
                        if (maxSelection === 1) {
                          Alert.alert(
                            "Selection Limit",
                            `You can only select 1 option from "${groupName}". Please deselect the current selection first.`
                          );
                        } else {
                          Alert.alert(
                            "Selection Limit",
                            `You can only select up to ${maxSelection} option(s) from "${groupName}". Please deselect an option first.`
                          );
                        }
                        return;
                      }
                      toggleVariation(group, variation);
                    }}
                    disabled={showQuantityControls}
                  >
                    {variation.image_url && (
                      <Image 
                        source={{ uri: variation.image_url }} 
                        style={styles.variationImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.variationTextContainer}>
                      <Text style={styles.variationName}>{variation.variation_name}</Text>
                      <Text style={styles.variationPrice}>+₱{variation.additional_price}</Text>
                    </View>
                  </TouchableOpacity>
                  {showQuantityControls ? (
                    <View style={styles.variationQuantityContainer}>
                      <TouchableOpacity
                        style={[styles.variationQtyButton, variationQty === 0 && styles.variationQtyButtonDisabled]}
                        onPress={() => updateVariationQuantity(variation, -1)}
                        disabled={variationQty === 0}
                      >
                        <Text style={[styles.variationQtyButtonText, variationQty === 0 && styles.variationQtyButtonTextDisabled]}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.variationQtyValue}>{variationQty}</Text>
                      <TouchableOpacity
                        style={[styles.variationQtyButton, variationQty >= maxAmount && styles.variationQtyButtonDisabled]}
                        onPress={() => {
                          if (isUnclickable && variationQty === 0) {
                            if (maxSelection === 1) {
                              Alert.alert(
                                "Selection Limit",
                                `You can only select 1 option from "${groupName}". Please deselect the current selection first.`
                              );
                            } else {
                              Alert.alert(
                                "Selection Limit",
                                `You can only select up to ${maxSelection} option(s) from "${groupName}". Please deselect an option first.`
                              );
                            }
                            return;
                          }
                          updateVariationQuantity(variation, 1);
                        }}
                        disabled={variationQty >= maxAmount}
                      >
                        <Text style={[styles.variationQtyButtonText, variationQty >= maxAmount && styles.variationQtyButtonTextDisabled]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          );
        })}

        {/* Note */}
        <Text style={styles.noteLabel}>Add Note:</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="e.g. No onions, extra spicy..."
          value={note}
          onChangeText={setNote}
          multiline
        />

        {/* Buttons */}
        <TouchableOpacity 
          style={[styles.btn, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnDisabled]} 
          onPress={() => submitOrder(true)} 
          disabled={placingOrder || (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter)}
        >
          <Text style={[styles.btnText, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnTextDisabled]}>
            Add to Cart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btn, styles.btnAlt, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnDisabled]} 
          onPress={() => submitOrder(false)} 
          disabled={placingOrder || (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter)}
        >
          <Text style={[styles.btnText, (!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter) && styles.btnTextDisabled]}>
            Place Order
          </Text>
        </TouchableOpacity>

        {/* Feedback Section */}
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>Customer Feedback</Text>
          {eligibilityChecked && !canLeaveFeedback ? (
            <Text style={styles.feedbackInfo}>Only customers who have completed an order for this item can leave feedback.</Text>
          ) : null}
          {eligibilityChecked && canLeaveFeedback ? (
            <View style={{ gap: 8, marginBottom: 10 }}>
              <Text style={{ fontWeight: '600' }}>Add Feedback</Text>
              <View style={styles.ratingRow}>
                {[1,2,3,4,5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setFeedbackRating(n)}>
                    <Text style={[styles.star, feedbackRating >= n && styles.starActive]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Share your experience (optional)"
                value={feedbackComment}
                onChangeText={setFeedbackComment}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.btn, styles.btnAlt, { flex: 1 }]} disabled={submittingFeedback} onPress={submitFeedback}>
                  <Text style={styles.btnText}>{submittingFeedback ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { flex: 1 }]}
                  disabled={submittingFeedback}
                  onPress={() => { setFeedbackComment(''); setFeedbackRating(5); }}
                >
                  <Text style={styles.btnText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {feedbacks.length === 0 ? (
            <Text style={styles.noFeedback}>No feedback yet.</Text>
          ) : (
            feedbacks.map((fb) => (
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
                    <Text style={styles.feedbackUser}>
                      {fb.customer_id === user?.id
                        ? `${fb.first_name} ${fb.last_name} (You)`
                        : `${fb.first_name} ${fb.last_name}`}
                    </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#A40C2D" },
  subText: { fontSize: 14, color: "#555", marginBottom: 5 },
  link: { color: "#A40C2D", fontWeight: "600" },

  priceQtyWrapper: { alignItems: "flex-start", marginVertical: 10 },
  price: { fontSize: 20, fontWeight: "bold", color: "#A40C2D", marginBottom: 5 },
  quantityContainer: { flexDirection: "row", alignItems: "center" },
  qtyBtn: { padding: 6, backgroundColor: "#A40C2D", borderRadius: 6, marginHorizontal: 8 },
  qtyText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  qtyValue: { fontSize: 16, fontWeight: "600" },

  desc: { fontSize: 14, color: "#666", marginBottom: 15 },
  
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
  diningOptionSelected: {
    borderColor: "#A40C2D",
    backgroundColor: "#A40C2D22",
  },
  diningOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  diningOptionTextSelected: {
    color: "#A40C2D",
    fontWeight: "600",
  },
  
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
  paymentMethodSelected: {
    borderColor: "#A40C2D",
    backgroundColor: "#A40C2D22",
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  paymentMethodTextSelected: {
    color: "#A40C2D",
    fontWeight: "600",
  },
  gcashNumberText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  noPaymentMethodsText: {
    fontSize: 14,
    color: "#ff6b6b",
    textAlign: "center",
    fontStyle: "italic",
    padding: 10,
    backgroundColor: "#ffe0e0",
    borderRadius: 8,
  },
  
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  required: { color: "red", fontSize: 14 },
  multiple: { fontSize: 12, color: "#555", marginLeft: 5 },
  selectionCounter: { fontSize: 12, color: "#666", marginTop: 4, fontWeight: "500" },
  option: { padding: 10, backgroundColor: "#f2f2f2", borderRadius: 8, marginBottom: 6 },
  optionSelected: { backgroundColor: "#A40C2D33", borderWidth: 1, borderColor: "#A40C2D" },
  variationContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  variationImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  variationTextContainer: { flex: 1 },
  variationName: { fontSize: 16, fontWeight: "500" },
  variationPrice: { fontSize: 14, color: "#A40C2D", fontWeight: "600" },
  variationQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  variationQtyButton: {
    width: 32,
    height: 32,
    backgroundColor: "#A40C2D",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  variationQtyButtonDisabled: {
    backgroundColor: "#ccc",
  },
  variationQtyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  variationQtyButtonTextDisabled: {
    color: "#999",
  },
  variationQtyValue: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
  },

  noteLabel: { fontSize: 14, fontWeight: "600", marginTop: 10, marginBottom: 5 },
  noteInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, minHeight: 50, marginBottom: 15 },

  btn: { backgroundColor: "#A40C2D", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 10 },
  btnAlt: { backgroundColor: "#444" },
  btnDisabled: { backgroundColor: "#ccc", opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  btnTextDisabled: { color: "#999" },

  feedbackContainer: { marginTop: 20 },
  feedbackTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  feedbackInfo: { color: "#666", fontSize: 12, marginBottom: 8 },
  noFeedback: { color: "#888", fontStyle: "italic" },
  feedbackCard: { backgroundColor: "#f9f9f9", padding: 10, borderRadius: 6, marginBottom: 10 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  profilePlaceholder: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  profileInitials: { color: "#fff", fontWeight: "bold" },
  feedbackUser: { fontWeight: "600" },
  feedbackRating: { color: "#A40C2D" },
  feedbackComment: { color: "#333", marginVertical: 3 },
  feedbackDate: { fontSize: 12, color: "#888" },
  feedbackModal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0006',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackModalCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    gap: 10,
  },
  feedbackModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#A40C2D' },
  ratingRow: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  star: { fontSize: 24, color: '#ccc' },
  starActive: { color: '#FFD700' },
  feedbackInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 60 },
});

export default MenuItemDetails;
