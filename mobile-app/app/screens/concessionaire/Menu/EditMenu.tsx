import React, { useState } from "react";
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
import { Picker } from "@react-native-picker/picker";
import { z } from "zod";
import api from "../../../libs/apiCall";

// ✅ Validation Schema
const menuSchema = z.object({
  item_name: z.string().min(2, "Item name must be at least 2 characters"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
  category: z.string().min(1, "Category is required"),
});

const EditMenu = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { item } = route.params;

  const [itemName, setItemName] = useState(item.item_name || "");
  const [price, setPrice] = useState(item.price?.toString() || "");
  const [category, setCategory] = useState(item.category || "Beverage");
  const [availability, setAvailability] = useState(
    item.availability ?? true
  );
  const [imageError, setImageError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [variationGroups, setVariationGroups] = useState<
    { label: string; variations: { name: string; price: string }[] }[]
  >(item.variations || []);

  // === Variation Group Handlers ===
  const handleAddVariationGroup = () => {
    setVariationGroups([...variationGroups, { label: "", variations: [] }]);
  };

  const handleRemoveVariationGroup = (groupIndex: number) => {
    const updatedGroups = [...variationGroups];
    updatedGroups.splice(groupIndex, 1);
    setVariationGroups(updatedGroups);
  };

  const handleAddVariation = (groupIndex: number) => {
    const updatedGroups = [...variationGroups];
    updatedGroups[groupIndex].variations.push({ name: "", price: "" });
    setVariationGroups(updatedGroups);
  };

  const handleRemoveVariation = (groupIndex: number, variationIndex: number) => {
    const updatedGroups = [...variationGroups];
    updatedGroups[groupIndex].variations.splice(variationIndex, 1);
    setVariationGroups(updatedGroups);
  };

  const handleUpdateGroupLabel = (index: number, text: string) => {
    const updatedGroups = [...variationGroups];
    updatedGroups[index].label = text;
    setVariationGroups(updatedGroups);
  };

  const handleUpdateVariation = (
    groupIndex: number,
    variationIndex: number,
    field: "name" | "price",
    value: string
  ) => {
    const updatedGroups = [...variationGroups];
    updatedGroups[groupIndex].variations[variationIndex][field] = value;
    setVariationGroups(updatedGroups);
  };

  // === Submit Update ===
  const handleUpdateMenu = async () => {
    setErrors({});
    const validation = menuSchema.safeParse({
      item_name: itemName,
      price,
      category,
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) newErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    try {
      // ✅ Convert prices to numbers before sending
      const formattedVariations = variationGroups.map((group) => ({
        label: group.label,
        variations: group.variations.map((v) => ({
          name: v.name,
          price: parseFloat(v.price) || 0,
        })),
      }));

      await api.put(`/menu-item/${item.id}`, {
        item_name: itemName,
        price: parseFloat(price),
        image_url: item.image_url || null, // keep existing image
        category,
        availability,
        variations: formattedVariations,
      });

      Alert.alert("Success", "Menu item updated successfully!", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error updating menu item:", error);
      Alert.alert("Error", "Failed to update menu item. Try again.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Image Preview */}
      <Image
        source={{
          uri:
            !imageError && item.image_url
              ? item.image_url
              : "https://cdn-icons-png.flaticon.com/512/9417/9417083.png",
        }}
        style={styles.image}
        onError={() => setImageError(true)}
      />

      <Text style={styles.label}>Item Name *</Text>
      <TextInput style={styles.input} value={itemName} onChangeText={setItemName} />
      {errors.item_name && <Text style={styles.error}>{errors.item_name}</Text>}

      <Text style={styles.label}>Price *</Text>
      <TextInput
        style={styles.input}
        value={price}
        keyboardType="numeric"
        onChangeText={setPrice}
      />
      {errors.price && <Text style={styles.error}>{errors.price}</Text>}

      {/* Category */}
      <Text style={styles.label}>Category *</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={category} onValueChange={setCategory}>
          <Picker.Item label="Beverage" value="Beverage" />
          <Picker.Item label="Snack" value="Snack" />
          <Picker.Item label="Meal" value="Meal" />
          <Picker.Item label="Dessert" value="Dessert" />
        </Picker>
      </View>
      {errors.category && <Text style={styles.error}>{errors.category}</Text>}

      {/* Availability Toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.label}>Availability</Text>
        <Switch
          value={availability}
          onValueChange={setAvailability}
          trackColor={{ true: "darkred" }}
        />
      </View>

      {/* Variations */}
      <Text style={[styles.label, { marginTop: 20 }]}>Variations</Text>
      {variationGroups.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.groupBox}>
          <TextInput
            style={styles.input}
            placeholder="Variation Group Label (e.g., Add-ons)"
            value={group.label}
            onChangeText={(text) => handleUpdateGroupLabel(groupIndex, text)}
          />

          {group.variations.map((variation, variationIndex) => (
            <View key={variationIndex} style={styles.variationRow}>
              <TextInput
                style={[styles.input, styles.variationInput]}
                placeholder="Variation Name"
                value={variation.name}
                onChangeText={(text) =>
                  handleUpdateVariation(groupIndex, variationIndex, "name", text)
                }
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Additional Price"
                keyboardType="numeric"
                value={variation.price}
                onChangeText={(text) =>
                  handleUpdateVariation(groupIndex, variationIndex, "price", text)
                }
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveVariation(groupIndex, variationIndex)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => handleAddVariation(groupIndex)}
            >
              <Text style={styles.smallButtonText}>+ Add Variation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeGroupButton}
              onPress={() => handleRemoveVariationGroup(groupIndex)}
            >
              <Text style={styles.removeGroupButtonText}>Remove Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.buttonOutline} onPress={handleAddVariationGroup}>
        <Text style={styles.buttonOutlineText}>+ Add Variation Group</Text>
      </TouchableOpacity>

      {/* Update & Delete Buttons side by side */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleUpdateMenu}>
          <Text style={styles.buttonText}>Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "gray" }]}
          onPress={async () => {
            Alert.alert("Confirm Delete", "Are you sure you want to delete this menu item?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await api.delete(`/menu-item/${item.id}`);
                    Alert.alert("Deleted", "Menu item deleted successfully!", [
                      { text: "OK", onPress: () => navigation.goBack() },
                    ]);
                  } catch (error) {
                    console.error("Error deleting menu item:", error);
                    Alert.alert("Error", "Failed to delete menu item. Try again.");
                  }
                },
              },
            ]);
          }}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default EditMenu;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 16,
    backgroundColor: "#eee",
  },
  label: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  error: { color: "red", fontSize: 12, marginTop: 4 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 6,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    alignItems: "center",
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
  },
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    flex: 1,
    backgroundColor: "darkred",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
