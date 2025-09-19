// screens/EditMenu.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView, TouchableOpacity, Image, Alert, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../../../libs/apiCall";


type Variation = { name: string; price: string };
type VariationGroup = { label: string; variations: Variation[] };

const EditMenu = () => {
  const route = useRoute<any>();
  const { menuItem } = route.params;
  const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

  

  const [itemName, setItemName] = useState(menuItem?.item_name || "");
  const [price, setPrice] = useState(menuItem?.price?.toString() || "");
  const [category, setCategory] = useState(menuItem?.category || "");
  const [availability, setAvailability] = useState(menuItem?.availability || true);
  const [image, setImage] = useState<any>(menuItem?.image_url || null);
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>(menuItem?.variations || []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const addVariationGroup = () => {
    setVariationGroups([...variationGroups, { label: "", variations: [{ name: "", price: "" }] }]);
  };

  const removeVariationGroup = (index: number) => {
    const updated = [...variationGroups];
    updated.splice(index, 1);
    setVariationGroups(updated);
  };

  const addVariation = (groupIndex: number) => {
    const updated = [...variationGroups];
    updated[groupIndex].variations.push({ name: "", price: "" });
    setVariationGroups(updated);
  };

  const removeVariation = (groupIndex: number, varIndex: number) => {
    const updated = [...variationGroups];
    updated[groupIndex].variations.splice(varIndex, 1);
    setVariationGroups(updated);
  };

  const updateVariation = (groupIndex: number, varIndex: number, key: "name" | "price", value: string) => {
    const updated = [...variationGroups];
    updated[groupIndex].variations[varIndex][key] = value;
    setVariationGroups(updated);
  };

const handleSubmit = async () => {
  if (!itemName || !price || !category) {
    Alert.alert("Please fill all required fields");
    return;
  }

  const formData = new FormData();
  formData.append("item_name", itemName);
  formData.append("price", price);
  formData.append("category", category);
  formData.append("availability", availability ? "true" : "false");
  formData.append("variations", JSON.stringify(variationGroups));

  if (image && image.base64) {
    formData.append("image", {
      uri: image.uri,
      name: "menuitem.jpg",
      type: "image/jpeg",
    } as any);
  }

  try {
    setLoading(true);
    await api.put(`/menu-item/${menuItem.id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    Alert.alert("Success", "Menu item updated successfully");
    navigation.goBack();
  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Failed to update menu item");
  } finally {
    setLoading(false);
  }
};


  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        <Image source={{ uri: image?.uri || image }} style={styles.image} />
      </TouchableOpacity>

      <Text style={styles.label}>Item Name</Text>
      <TextInput style={styles.input} value={itemName} onChangeText={setItemName} />

      <Text style={styles.label}>Price</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

      <Text style={styles.label}>Category</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} />

      <View style={styles.toggleRow}>
        <Text style={styles.label}>Availability</Text>
        <TouchableOpacity onPress={() => setAvailability(!availability)}>
          <Text>{availability ? "Available" : "Not Available"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginTop: 20 }]}>Variation Groups</Text>
      {variationGroups.map((group, gIndex) => (
        <View key={gIndex} style={styles.groupBox}>
          <TextInput
            style={styles.input}
            value={group.label}
            onChangeText={(val) => {
              const updated = [...variationGroups];
              updated[gIndex].label = val;
              setVariationGroups(updated);
            }}
          />

          {group.variations.map((v, vIndex) => (
            <View key={vIndex} style={styles.variationRow}>
              <TextInput
                style={[styles.input, styles.variationInput]}
                placeholder="Variation Name"
                value={v.name}
                onChangeText={(val) => updateVariation(gIndex, vIndex, "name", val)}
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Price"
                keyboardType="numeric"
                value={v.price.toString()}
                onChangeText={(val) => updateVariation(gIndex, vIndex, "price", val)}
              />
              <TouchableOpacity style={styles.removeButton} onPress={() => removeVariation(gIndex, vIndex)}>
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.smallButton} onPress={() => addVariation(gIndex)}>
            <Text style={styles.smallButtonText}>Add Variation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.removeGroupButton} onPress={() => removeVariationGroup(gIndex)}>
            <Text style={styles.removeGroupButtonText}>Remove Group</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.smallButton} onPress={addVariationGroup}>
        <Text style={styles.smallButtonText}>Add Variation Group</Text>
      </TouchableOpacity>

<TouchableOpacity
  style={styles.button}
  onPress={handleSubmit}
  disabled={loading}
>
  <Text style={styles.buttonText}>{loading ? "Saving..." : "Save Changes"}</Text>
</TouchableOpacity>

    </ScrollView>
  );
};

export default EditMenu;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  image: { width: 120, height: 120, borderRadius: 60, alignSelf: "center", marginBottom: 16, backgroundColor: "#eee" },
  label: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8, marginTop: 6, backgroundColor: "#fff" },
  pickerWrapper: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginTop: 6 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, alignItems: "center" },
  groupBox: { borderWidth: 1, borderColor: "#aaa", borderRadius: 8, padding: 10, marginTop: 12, backgroundColor: "#f9f9f9" },
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
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  button: { flex: 1, backgroundColor: "darkred", padding: 14, borderRadius: 8, alignItems: "center", marginVertical: 10 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
