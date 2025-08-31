import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import api from "../../../libs/apiCall";

const EditMenu = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { item } = route.params;

  const [itemName, setItemName] = useState(item.item_name || "");
  const [price, setPrice] = useState(item.price?.toString() || "");
  const [imageUrl, setImageUrl] = useState(item.image_url || "");
  const [category, setCategory] = useState(item.category || "Beverage");

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
    if (!itemName || !price) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      await api.put(`/menu-item/${item.id}`, {
        item_name: itemName,
        price,
        image_url: imageUrl || null,
        category,
        variations: variationGroups,
      });

      Alert.alert("Success", "Menu item updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error updating menu item:", error);
      Alert.alert("Error", "Failed to update menu item. Try again.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Item Name *</Text>
      <TextInput
        style={styles.input}
        value={itemName}
        onChangeText={setItemName}
      />

      <Text style={styles.label}>Price *</Text>
      <TextInput
        style={styles.input}
        value={price}
        keyboardType="numeric"
        onChangeText={setPrice}
      />

      <Text style={styles.label}>Image URL</Text>
      <TextInput
        style={styles.input}
        value={imageUrl}
        onChangeText={setImageUrl}
      />

      {/* CATEGORY DROPDOWN */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={category} onValueChange={setCategory}>
          <Picker.Item label="Beverage" value="Beverage" />
          <Picker.Item label="Snack" value="Snack" />
          <Picker.Item label="Meal" value="Meal" />
          <Picker.Item label="Dessert" value="Dessert" />
        </Picker>
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

      <TouchableOpacity style={styles.button} onPress={handleUpdateMenu}>
        <Text style={styles.buttonText}>Update Menu Item</Text>
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
  <Text style={styles.buttonText}>Delete Menu Item</Text>
</TouchableOpacity>

    </ScrollView>
  );
};

export default EditMenu;

// ✅ Reuse the same styles from AddMenu
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 6,
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
  button: {
    backgroundColor: "darkred",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
