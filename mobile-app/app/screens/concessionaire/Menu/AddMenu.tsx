// screens/Menu/AddMenu.tsx
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import api from "../../../libs/apiCall";
import axios from "axios";

const AddMenu: React.FC = () => {
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<any>(null); // new image asset
  const [category, setCategory] = useState("Beverage");
  const [variationGroups, setVariationGroups] = useState<
    { label: string; variations: { name: string; price: string }[] }[]
  >([]);

  const navigation = useNavigation<any>();

  // pick image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  // === Variation handlers (same as edit)
  const handleAddVariationGroup = () => {
    setVariationGroups([...variationGroups, { label: "", variations: [] }]);
  };

  const handleRemoveVariationGroup = (groupIndex: number) => {
    const updated = [...variationGroups];
    updated.splice(groupIndex, 1);
    setVariationGroups(updated);
  };

  const handleAddVariation = (groupIndex: number) => {
    const updated = [...variationGroups];
    updated[groupIndex].variations.push({ name: "", price: "" });
    setVariationGroups(updated);
  };

  const handleRemoveVariation = (groupIndex: number, variationIndex: number) => {
    const updated = [...variationGroups];
    updated[groupIndex].variations.splice(variationIndex, 1);
    setVariationGroups(updated);
  };

  const handleUpdateGroupLabel = (index: number, text: string) => {
    const updated = [...variationGroups];
    updated[index].label = text;
    setVariationGroups(updated);
  };

  const handleUpdateVariation = (
    groupIndex: number,
    variationIndex: number,
    field: "name" | "price",
    value: string
  ) => {
    const updated = [...variationGroups];
    updated[groupIndex].variations[variationIndex][field] = value;
    setVariationGroups(updated);
  };

  // submit
  const handleAddMenu = async () => {
    if (!itemName.trim() || !price.trim()) {
      Alert.alert("Error", "Please fill in item name and price.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("item_name", itemName.trim());
      formData.append("price", String(price).trim());
      formData.append("category", category);

      if (image && image.uri) {
        // RN form file
        formData.append("image", {
          uri: image.uri,
          type: image.type || "image/jpeg",
          name: image.fileName || `menu-${Date.now()}.jpg`,
        } as any);
      }

      formData.append("variations", JSON.stringify(variationGroups));

      await api.post("/menu-item", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Success", "Menu item added successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("AddMenu error:", err.response?.data ?? err.message);
        Alert.alert("Error", err.response?.data?.message ?? "Failed to add item");
      } else if (err instanceof Error) {
        console.error(err.message);
        Alert.alert("Error", err.message);
      } else {
        console.error(err);
        Alert.alert("Error", "Unknown error occurred");
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <Text style={styles.label}>Item Name *</Text>
      <TextInput style={styles.input} value={itemName} onChangeText={setItemName} />

      <Text style={styles.label}>Price *</Text>
      <TextInput
        style={styles.input}
        value={price}
        keyboardType="numeric"
        onChangeText={setPrice}
      />

      <Text style={styles.label}>Image</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        ) : (
          <Text style={{ color: "#555" }}>Pick an image</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={category} onValueChange={setCategory}>
          <Picker.Item label="Beverage" value="Beverage" />
          <Picker.Item label="Snack" value="Snack" />
          <Picker.Item label="Meal" value="Meal" />
          <Picker.Item label="Dessert" value="Dessert" />
        </Picker>
      </View>

      {/* Variations UI */}
      <Text style={[styles.label, { marginTop: 18 }]}>Variations</Text>
      {variationGroups.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.groupBox}>
          <TextInput
            style={styles.input}
            placeholder="Group label (e.g. Size)"
            value={group.label}
            onChangeText={(t) => handleUpdateGroupLabel(groupIndex, t)}
          />

          {group.variations.map((v, i) => (
            <View key={i} style={styles.variationRow}>
              <TextInput
                style={[styles.input, styles.variationInput]}
                placeholder="Name"
                value={v.name}
                onChangeText={(t) => handleUpdateVariation(groupIndex, i, "name", t)}
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Additional price"
                keyboardType="numeric"
                value={v.price}
                onChangeText={(t) => handleUpdateVariation(groupIndex, i, "price", t)}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveVariation(groupIndex, i)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity style={styles.smallButton} onPress={() => handleAddVariation(groupIndex)}>
              <Text style={styles.smallButtonText}>+ Add Variation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeGroupButton} onPress={() => handleRemoveVariationGroup(groupIndex)}>
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
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "#fff",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 6,
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
  removeButton: { backgroundColor: "#ffdddd", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  removeButtonText: { color: "darkred", fontWeight: "bold" },
  smallButton: { backgroundColor: "#eee", padding: 8, borderRadius: 6, marginTop: 8, alignItems: "center" },
  smallButtonText: { color: "darkred", fontWeight: "600" },
  removeGroupButton: { backgroundColor: "#ffeaea", padding: 8, borderRadius: 6, marginTop: 8, alignItems: "center" },
  removeGroupButtonText: { color: "red", fontWeight: "600" },
  buttonOutline: { borderWidth: 1, borderColor: "darkred", padding: 14, borderRadius: 8, marginTop: 16, alignItems: "center" },
  buttonOutlineText: { color: "darkred", fontWeight: "600", fontSize: 14 },
  button: { backgroundColor: "darkred", padding: 14, borderRadius: 8, marginTop: 20, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
