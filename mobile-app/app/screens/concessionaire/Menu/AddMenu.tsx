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
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import api from "../../../libs/apiCall";

const AddMenu = () => {
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Beverage");

  // Each label = variation group, inside it variations have name + price
  const [variationGroups, setVariationGroups] = useState<
    { label: string; variations: { name: string; price: string }[] }[]
  >([]);

  const navigation = useNavigation<any>();

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

  const handleAddMenu = async () => {
    if (!itemName || !price) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      await api.post("/menu-item", {
        item_name: itemName,
        price,
        image_url: imageUrl || null,
        category,
        variations: variationGroups,
      });

      Alert.alert("Success", "Menu item added successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error adding menu item:", error);
      Alert.alert("Error", "Failed to add menu item. Try again.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Item Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter item name"
        value={itemName}
        onChangeText={setItemName}
      />

      <Text style={styles.label}>Price *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter base price"
        value={price}
        keyboardType="numeric"
        onChangeText={setPrice}
      />

      <Text style={styles.label}>Image URL</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter image URL"
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

      <TouchableOpacity style={styles.button} onPress={handleAddMenu}>
        <Text style={styles.buttonText}>Add Menu Item</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddMenu;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
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
  variationInput: {
    flex: 2,
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    marginRight: 6,
  },
  removeButton: {
    backgroundColor: "#ffdddd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: "darkred",
    fontWeight: "bold",
  },
  smallButton: {
    backgroundColor: "#eee",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
  },
  smallButtonText: {
    color: "darkred",
    fontWeight: "600",
  },
  removeGroupButton: {
    backgroundColor: "#ffeaea",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
  },
  removeGroupButtonText: {
    color: "red",
    fontWeight: "600",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "darkred",
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  buttonOutlineText: {
    color: "darkred",
    fontWeight: "600",
    fontSize: 14,
  },
  button: {
    backgroundColor: "darkred",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
