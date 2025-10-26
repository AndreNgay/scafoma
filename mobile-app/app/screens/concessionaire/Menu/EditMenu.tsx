// screens/Menu/EditMenu.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Switch,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { z } from "zod";
import api from "../../../libs/apiCall";

type Variation = { 
  name: string; 
  price: string; 
  image?: any; 
  image_url?: string;
  variation_id?: number;
};
type VariationGroup = {
  label: string;
  variations: Variation[];
  required_selection: boolean;
  max_selection: number;
};

const EditMenu: React.FC = () => {
  const route = useRoute<any>();
  const { menuItem } = route.params;
  const navigation = useNavigation<any>();

  const [itemName, setItemName] = useState(menuItem?.item_name || "");
  const [price, setPrice] = useState(menuItem?.price?.toString() || "");
  const [category, setCategory] = useState(menuItem?.category || "");
  const [availability, setAvailability] = useState(
    menuItem?.availability !== undefined ? menuItem.availability : true
  );
  const [image, setImage] = useState<any>(
    menuItem?.image_url ? { uri: menuItem.image_url } : null
  );
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>(() => {
    if (!menuItem?.variations || !Array.isArray(menuItem.variations)) {
      return [];
    }
    // Convert variation prices from number to string for display and preserve images
    return menuItem.variations.map((group: any) => ({
      label: group.label,
      required_selection: group.required_selection || false,
      max_selection: group.max_selection || 1,
      variations: group.variations.map((v: any) => ({
        ...v,
        price: v.price?.toString() || "",
        image_url: v.image_url
      }))
    }));
  });
  const [loading, setLoading] = useState(false);

  // Tooltip state
  const [tooltip, setTooltip] = useState<string | null>(null);

  // Auto-dismiss tooltip after 5s
  useEffect(() => {
    if (!tooltip) return;
    const timer = setTimeout(() => setTooltip(null), 5000);
    return () => clearTimeout(timer);
  }, [tooltip]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const pickVariationImage = async (gIndex: number, vIndex: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const updated = [...variationGroups];
      updated[gIndex].variations[vIndex].image = result.assets[0];
      updated[gIndex].variations[vIndex].image_url = result.assets[0].uri;
      setVariationGroups(updated);
    }
  };

  const addVariationGroup = () =>
    setVariationGroups([
      ...variationGroups,
      {
        label: "",
        variations: [],
        required_selection: false,
        max_selection: 1,
      },
    ]);

  const removeVariationGroup = (i: number) => {
    const updated = [...variationGroups];
    updated.splice(i, 1);
    setVariationGroups(updated);
  };

  const addVariation = (gIndex: number) => {
    const updated = [...variationGroups];
    updated[gIndex].variations.push({ name: "", price: "" });
    setVariationGroups(updated);
  };

  const removeVariation = (gIndex: number, vIndex: number) => {
    const updated = [...variationGroups];
    updated[gIndex].variations.splice(vIndex, 1);
    setVariationGroups(updated);
  };

  const updateGroupLabel = (index: number, value: string) => {
    const updated = [...variationGroups];
    updated[index].label = value;
    setVariationGroups(updated);
  };

  const updateMaxSelection = (index: number, value: string) => {
    const updated = [...variationGroups];
    const numValue = parseInt(value) || 1;
    const numVariations = updated[index].variations.length;
    const maxAllowed = numVariations > 0 ? numVariations : 1;
    
    // Limit max_selection to number of variations
    if (numValue > maxAllowed) {
      Alert.alert("Invalid Value", `Max selection cannot exceed the number of variations (${numVariations})`);
      updated[index].max_selection = maxAllowed;
    } else {
      updated[index].max_selection = numValue > 0 ? numValue : 1;
    }
    setVariationGroups(updated);
  };

  const incrementMaxSelection = (index: number) => {
    const updated = [...variationGroups];
    const currentValue = updated[index].max_selection || 1;
    const numVariations = updated[index].variations.length;
    const maxAllowed = numVariations > 0 ? numVariations : 1;
    if (currentValue < maxAllowed) {
      updated[index].max_selection = currentValue + 1;
      setVariationGroups(updated);
    } else {
      Alert.alert("Limit Reached", `Max selection cannot exceed the number of variations (${numVariations})`);
    }
  };

  const decrementMaxSelection = (index: number) => {
    const updated = [...variationGroups];
    const currentValue = updated[index].max_selection || 1;
    updated[index].max_selection = currentValue > 1 ? currentValue - 1 : 1;
    setVariationGroups(updated);
  };

  const updateVariation = (
    gIndex: number,
    vIndex: number,
    key: "name" | "price",
    value: string
  ) => {
    const updated = [...variationGroups];
    updated[gIndex].variations[vIndex][key] = value;
    setVariationGroups(updated);
  };

  const toggleGroupOption = (
    gIndex: number,
    key: "required_selection"
  ) => {
    const updated = [...variationGroups];
    updated[gIndex][key] = !updated[gIndex][key];
    setVariationGroups(updated);
  };

  // Validation schema
  const variationGroupSchema = z.object({
    label: z.string().min(1, "Group label is required"),
    max_selection: z.number().int().positive().max(100, "Max selection must be between 1 and 100"),
  });

  const handleUpdateMenu = async () => {
    if (!itemName.trim() || !price.trim()) {
      Alert.alert("Error", "Please fill in item name and price.");
      return;
    }

    // Validate variation groups
    for (const group of variationGroups) {
      try {
        // Check if variation group has no variations
        if (group.variations.length === 0) {
          Alert.alert("Validation Error", `Variation group "${group.label}" has no variations. Please add at least one variation or remove the group.`);
          return;
        }
        
        const numVariations = group.variations.length;
        const maxAllowed = numVariations > 0 ? numVariations : 1;
        
        // Check if max_selection exceeds number of variations
        if (group.max_selection > maxAllowed) {
          Alert.alert("Validation Error", `${group.label}: Max selection (${group.max_selection}) cannot exceed the number of variations (${numVariations})`);
          return;
        }
        
        variationGroupSchema.parse({
          label: group.label,
          max_selection: group.max_selection,
        });
      } catch (err: any) {
        Alert.alert("Validation Error", err.errors[0].message);
        return;
      }
    }

    const formData = new FormData();
    formData.append("item_name", itemName.trim());
    formData.append("price", price.trim());
    formData.append("category", category.trim());
    formData.append("availability", availability ? "true" : "false");
    formData.append("variations", JSON.stringify(variationGroups));

    if (image?.uri && !image.uri.startsWith("data")) {
      formData.append("image", {
        uri: image.uri,
        type: "image/jpeg",
        name: `menu-${Date.now()}.jpg`,
      } as any);
    }

    try {
      setLoading(true);
      await api.put(`/menu-item/${menuItem.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Upload variation images if any were changed
      await uploadVariationImages();
      
      Alert.alert("Success", "Menu item updated successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      console.error(err);
      Alert.alert("Error", "Failed to update menu item.");
    } finally {
      setLoading(false);
    }
  };

  const uploadVariationImages = async () => {
    try {
      // Get the newly created variation groups from the server
      const groupsRes = await api.get(`/item-variation-group/${menuItem.id}`);
      const createdGroups = groupsRes.data.data;
      
      // Create a map of group labels to group IDs
      const groupMap = new Map();
      createdGroups.forEach((g: any) => {
        groupMap.set(g.variation_group_name, g.id);
      });
      
      // Upload images for variations that have new images
      for (let gIndex = 0; gIndex < variationGroups.length; gIndex++) {
        const group = variationGroups[gIndex];
        const groupId = groupMap.get(group.label);
        
        if (!groupId) continue;
        
        // Get variations for this group
        const variationsRes = await api.get(`/item-variation/group/${groupId}`);
        const createdVariations = variationsRes.data.data;
        
        // Create a map of variation names to IDs
        const variationMap = new Map();
        createdVariations.forEach((v: any) => {
          variationMap.set(v.variation_name, v.id);
        });
        
        // Upload images for variations with new images
        for (let vIndex = 0; vIndex < group.variations.length; vIndex++) {
          const variation = group.variations[vIndex];
          if (variation.image && variation.name) {
            const variationId = variationMap.get(variation.name);
            if (variationId) {
              const imageFormData = new FormData();
              imageFormData.append("image", {
                uri: variation.image.uri,
                type: "image/jpeg",
                name: `variation-${Date.now()}.jpg`,
              } as any);
              
              await api.put(`/item-variation/${variationId}/image`, imageFormData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error uploading variation images:", error);
      // Don't show error to user as the main menu item was updated successfully
    }
  };

  // Tooltip component
  const Tooltip = ({ id }: { id: string }) => {
    if (tooltip !== id) return null;

    let message = "";
    switch (id) {
      case "price":
        message = "This is the base price of the menu item.";
        break;
      case "availability":
        message = "Toggle to set if this menu item is available for ordering.";
        break;
      case "variations":
        message =
          "Add groups and variations like sizes or flavors with additional prices.";
        break;
      case "required":
        message =
          "Customer must select at least one option in this group.";
        break;
      case "max":
        message =
          "Maximum number of options customers can select from this group.";
        break;
    }

    return (
      <View style={styles.tooltipBox}>
        <Text style={styles.tooltipText}>{message}</Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={styles.label}>Item Name *</Text>
      <TextInput
        style={styles.input}
        value={itemName}
        onChangeText={setItemName}
      />

      {/* Price */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Base Price *</Text>
        <TouchableOpacity
          onPress={() =>
            setTooltip(tooltip === "price" ? null : "price")
          }
        >
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
      <Tooltip id="price" />
      <TextInput
        style={styles.input}
        value={price}
        keyboardType="numeric"
        onChangeText={setPrice}
      />

      {/* Image */}
      <Text style={styles.label}>Image</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        ) : (
          <Text style={{ color: "#555" }}>Pick an image</Text>
        )}
      </TouchableOpacity>

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Beverage, Snack, Meal..."
        value={category}
        onChangeText={setCategory}
      />

      {/* Availability */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Availability</Text>
        <TouchableOpacity
          onPress={() =>
            setTooltip(tooltip === "availability" ? null : "availability")
          }
        >
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
      <Tooltip id="availability" />
      <View style={styles.toggleRow}>
        <Switch
          value={availability}
          onValueChange={setAvailability}
          trackColor={{ false: "#ccc", true: "#A40C2D" }}
          thumbColor="#fff"
        />
      </View>

      {/* Variations */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { marginTop: 18 }]}>Variations</Text>
        <TouchableOpacity
          onPress={() =>
            setTooltip(tooltip === "variations" ? null : "variations")
          }
        >
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
      <Tooltip id="variations" />

      {variationGroups.map((group, gIndex) => (
        <View key={gIndex} style={styles.groupBox}>
          <TextInput
            style={styles.input}
            placeholder="Group label (e.g. Size)"
            value={group.label}
            onChangeText={(t) => updateGroupLabel(gIndex, t)}
          />

          {/* Group Options */}
          <View style={styles.toggleRow}>
            <Text>Required Selection</Text>
            <Switch
              value={group.required_selection}
              onValueChange={() =>
                toggleGroupOption(gIndex, "required_selection")
              }
              trackColor={{ false: "#ccc", true: "#A40C2D" }}
              thumbColor="#fff"
            />
            <TouchableOpacity
              onPress={() =>
                setTooltip(tooltip === "required" ? null : "required")
              }
            >
              <Text style={styles.infoIcon}>ℹ️</Text>
            </TouchableOpacity>
          </View>
          <Tooltip id="required" />

          {/* Max Selection */}
          <View style={styles.maxSelectionRowWithLabel}>
            <View style={styles.maxSelectionLabelContainer}>
              <Text style={styles.label}>Max Selection *</Text>
              <TouchableOpacity
                onPress={() => setTooltip(tooltip === "max" ? null : "max")}
              >
                <Text style={styles.infoIcon}>ℹ️</Text>
              </TouchableOpacity>
            </View>
            <Tooltip id="max" />
            <TouchableOpacity
              style={styles.maxSelectionButton}
              onPress={() => decrementMaxSelection(gIndex)}
            >
              <Text style={styles.maxSelectionButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.maxSelectionInput}
              keyboardType="numeric"
              value={group.max_selection?.toString() || "1"}
              onChangeText={(t) => updateMaxSelection(gIndex, t)}
            />
            <TouchableOpacity
              style={styles.maxSelectionButton}
              onPress={() => incrementMaxSelection(gIndex)}
            >
              <Text style={styles.maxSelectionButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.maxSelectionHint}>
            Max: {group.variations.length || 0} (based on number of variations)
          </Text>

          {/* Variations */}
          {group.variations.map((v, vIndex) => (
            <View key={vIndex} style={styles.variationRow}>
              {/* Image */}
              <TouchableOpacity
                style={styles.variationImageButton}
                onPress={() => pickVariationImage(gIndex, vIndex)}
              >
                {(v.image || v.image_url) ? (
                  <Image 
                    source={{ uri: v.image?.uri || v.image_url }} 
                    style={styles.variationImagePreview} 
                  />
                ) : (
                  <View style={styles.variationImagePlaceholder}>
                    <Text style={styles.variationImagePlaceholderText}>📷</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Name Input */}
              <TextInput
                style={[styles.input, styles.variationNameInput]}
                placeholder="Name"
                value={v.name}
                onChangeText={(t) =>
                  updateVariation(gIndex, vIndex, "name", t)
                }
              />

              {/* Price Input */}
              <TextInput
                style={[styles.input, styles.variationPriceInput]}
                placeholder="Price"
                keyboardType="numeric"
                value={v.price}
                onChangeText={(t) =>
                  updateVariation(gIndex, vIndex, "price", t)
                }
              />

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeVariationButton}
                onPress={() => removeVariation(gIndex, vIndex)}
              >
                <Text style={styles.removeVariationButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => addVariation(gIndex)}
            >
              <Text style={styles.smallButtonText}>+ Add Variation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeGroupButton}
              onPress={() => removeVariationGroup(gIndex)}
            >
              <Text style={styles.removeGroupButtonText}>Remove Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.buttonOutline} onPress={addVariationGroup}>
        <Text style={styles.buttonOutlineText}>+ Add Variation Group</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleUpdateMenu}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditMenu;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoIcon: { fontSize: 16, color: "#555" },
  tooltipBox: {
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 6,
    maxWidth: "90%",
  },
  tooltipText: { fontSize: 12, color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "#fff",
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  previewImage: { width: 120, height: 120, borderRadius: 10 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  groupBox: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    backgroundColor: "#f9f9f9",
  },
  variationRow: { 
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  variationImageButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  variationImagePreview: {
    width: "100%",
    height: "100%",
  },
  variationImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  variationImagePlaceholderText: {
    fontSize: 20,
  },
  variationNameInput: {
    flex: 2,
    marginTop: 0,
  },
  variationPriceInput: {
    flex: 1,
    marginTop: 0,
  },
  removeVariationButton: {
    width: 40,
    height: 40,
    backgroundColor: "#ffdddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  removeVariationButtonText: {
    color: "darkred",
    fontSize: 20,
    fontWeight: "bold",
  },
  maxSelectionContainer: {
    marginTop: 8,
  },
  maxSelectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  maxSelectionRowWithLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  maxSelectionLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 120,
  },
  maxSelectionButton: {
    width: 40,
    height: 40,
    backgroundColor: "#A40C2D",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  maxSelectionButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  maxSelectionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: "#fff",
  },
  maxSelectionHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginLeft: 8,
  },
  removeButton: {
    backgroundColor: "#ffdddd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: { color: "darkred", fontWeight: "bold" },
  smallButton: {
    backgroundColor: "#eee",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
  },
  smallButtonText: { color: "darkred", fontWeight: "600" },
  removeGroupButton: {
    backgroundColor: "#ffeaea",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
  },
  removeGroupButtonText: { color: "red", fontWeight: "600" },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "darkred",
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  buttonOutlineText: { color: "darkred", fontWeight: "600", fontSize: 14 },
  button: {
    backgroundColor: "darkred",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
