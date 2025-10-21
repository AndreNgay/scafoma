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
import api from "../../../libs/apiCall";

type Variation = { name: string; price: string; image?: any };
type VariationGroup = {
  label: string;
  variations: Variation[];
  multiple_selection: boolean;
  required_selection: boolean;
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
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>(
    menuItem?.variations || []
  );
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

  const handleUpdateMenu = async () => {
    if (!itemName.trim() || !price.trim()) {
      Alert.alert("Error", "Please fill in item name and price.");
      return;
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
  variationRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  variationInput: { flex: 2, marginRight: 6 },
  priceInput: { flex: 1, marginRight: 6 },
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
