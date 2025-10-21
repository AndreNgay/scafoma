// screens/Menu/AddMenu.tsx
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
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../../../libs/apiCall";

type Variation = { name: string; price: string; image?: any };
type VariationGroup = {
  label: string;
  variations: Variation[];
  multiple_selection: boolean;
  required_selection: boolean;
};

const AddMenu: React.FC = () => {
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(""); // ✅ text input now
  const [availability, setAvailability] = useState(false);
  const [image, setImage] = useState<any>(null);
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Tooltip state
  const [tooltip, setTooltip] = useState<string | null>(null);

  const navigation = useNavigation<any>();

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
      setVariationGroups(updated);
    }
  };

  const addVariationGroup = () =>
    setVariationGroups([
      ...variationGroups,
      {
        label: "",
        variations: [],
        multiple_selection: false,
        required_selection: false,
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
    key: "multiple_selection" | "required_selection"
  ) => {
    const updated = [...variationGroups];
    updated[gIndex][key] = !updated[gIndex][key];
    setVariationGroups(updated);
  };

  const handleAddMenu = async () => {
    if (!itemName.trim() || !price.trim()) {
      Alert.alert("Error", "Please fill in item name and price.");
      return;
    }

    const formData = new FormData();
    formData.append("item_name", itemName.trim());
    formData.append("price", price.trim());
    formData.append("category", category.trim()); // ✅ send typed category
    formData.append("availability", availability ? "true" : "false");
    
    // Separate variations with images from those without
    const variationsWithoutImages = variationGroups.map(group => ({
      ...group,
      variations: group.variations.map(v => ({ name: v.name, price: v.price }))
    }));
    formData.append("variations", JSON.stringify(variationsWithoutImages));

    if (image?.uri) {
      formData.append("image", {
        uri: image.uri,
        type: "image/jpeg",
        name: `menu-${Date.now()}.jpg`,
      } as any);
    }

    try {
      setLoading(true);
      const res = await api.post("/menu-item", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (res.data.status === "success") {
        const menuItemId = res.data.data.id;
        
        // Upload variation images separately
        await uploadVariationImages(menuItemId);
        
        Alert.alert("Success", "Menu item added successfully", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", res.data.message || "Failed to add menu item");
      }
    } catch (err: unknown) {
      console.error(err);
      Alert.alert("Error", "Failed to add menu item.");
    } finally {
      setLoading(false);
    }
  };

  const uploadVariationImages = async (menuItemId: number) => {
    try {
      // Get the created variation groups
      const groupsRes = await api.get(`/item-variation-group/${menuItemId}`);
      const groups = groupsRes.data.data;
      
      for (let gIndex = 0; gIndex < variationGroups.length; gIndex++) {
        const group = variationGroups[gIndex];
        const createdGroup = groups.find((g: any) => g.variation_group_name === group.label);
        
        if (createdGroup) {
          // Get variations for this group
          const variationsRes = await api.get(`/item-variation/group/${createdGroup.id}`);
          const createdVariations = variationsRes.data.data;
          
          for (let vIndex = 0; vIndex < group.variations.length; vIndex++) {
            const variation = group.variations[vIndex];
            const createdVariation = createdVariations.find((v: any) => v.variation_name === variation.name);
            
            if (createdVariation && variation.image) {
              // Upload variation image
              const imageFormData = new FormData();
              imageFormData.append("image", {
                uri: variation.image.uri,
                type: "image/jpeg",
                name: `variation-${Date.now()}.jpg`,
              } as any);
              
              await api.put(`/item-variation/${createdVariation.id}/image`, imageFormData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error uploading variation images:", error);
      // Don't show error to user as the main menu item was created successfully
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
      case "multi":
        message =
          "Allow customers to pick more than one option in this group.";
        break;
      case "required":
        message =
          "Customer must select at least one option in this group.";
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

      {/* ✅ Category now a text input */}
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
            <Text>Multiple Selection</Text>
            <Switch
              value={group.multiple_selection}
              onValueChange={() =>
                toggleGroupOption(gIndex, "multiple_selection")
              }
              trackColor={{ false: "#ccc", true: "#A40C2D" }}
              thumbColor="#fff"
            />
            <TouchableOpacity
              onPress={() =>
                setTooltip(tooltip === "multi" ? null : "multi")
              }
            >
              <Text style={styles.infoIcon}>ℹ️</Text>
            </TouchableOpacity>
          </View>
          <Tooltip id="multi" />

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

          {/* Variations */}
          {group.variations.map((v, vIndex) => (
            <View key={vIndex} style={styles.variationRow}>
              <View style={styles.variationInputs}>
                <TextInput
                  style={[styles.input, styles.variationInput]}
                  placeholder="Name"
                  value={v.name}
                  onChangeText={(t) =>
                    updateVariation(gIndex, vIndex, "name", t)
                  }
                />
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Additional price"
                  keyboardType="numeric"
                  value={v.price}
                  onChangeText={(t) =>
                    updateVariation(gIndex, vIndex, "price", t)
                  }
                />
              </View>
              <View style={styles.variationImageContainer}>
                {v.image ? (
                  <View style={styles.variationImagePreview}>
                    <Image source={{ uri: v.image.uri }} style={styles.variationImage} />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={() => pickVariationImage(gIndex, vIndex)}
                    >
                      <Text style={styles.changeImageText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={() => pickVariationImage(gIndex, vIndex)}
                  >
                    <Text style={styles.addImageText}>📷 Add Image</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeVariation(gIndex, vIndex)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
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
        onPress={handleAddMenu}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Saving..." : "Add Menu Item"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddMenu;

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
  variationRow: { marginTop: 6, padding: 8, backgroundColor: "#f9f9f9", borderRadius: 8 },
  variationInputs: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  variationInput: { flex: 2, marginRight: 6 },
  priceInput: { flex: 1, marginRight: 6 },
  variationImageContainer: { marginBottom: 8 },
  variationImagePreview: { alignItems: "center" },
  variationImage: { width: 80, height: 80, borderRadius: 8, marginBottom: 4 },
  changeImageButton: { backgroundColor: "#A40C2D", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  changeImageText: { color: "#fff", fontSize: 12 },
  addImageButton: { backgroundColor: "#f0f0f0", padding: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#ddd" },
  addImageText: { color: "#666", fontSize: 14 },
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
