// screens/Menu/EditMenu.tsx
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
import * as ImagePicker from "expo-image-picker";
import api from "../../../libs/apiCall";
import axios from "axios";

const EditMenu: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { item } = route.params;

  // initial values from item
  const [itemName, setItemName] = useState(item.item_name || "");
  const [price, setPrice] = useState(String(item.price ?? ""));
  const [category, setCategory] = useState(item.category || "Beverage");
  const [availability, setAvailability] = useState<boolean>(item.availability ?? true);

  // image state: initial is data url from server (image_url). When user picks new image, set image asset and mark isNew true.
  const [imageUri, setImageUri] = useState<string | null>(item.image_url ?? null);
  const [imageIsNew, setImageIsNew] = useState(false);
  const [imageAsset, setImageAsset] = useState<any>(null);

  // variations start from item.variations (already grouped)
  const [variationGroups, setVariationGroups] = useState<
    { label: string; variations: { name: string; price: string }[] }[]
  >(
    (item.variations || []).map((g: any) => ({
      label: g.label || "",
      variations: (g.variations || []).map((v: any) => ({
        name: v.name,
        price: String(v.price ?? 0),
      })),
    }))
  );

  // pick a new image (same as AddMenu)
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImageAsset(asset);
      setImageUri(asset.uri);
      setImageIsNew(true);
    }
  };

  // variation handlers (same as Add)
  const handleAddVariationGroup = () => setVariationGroups([...variationGroups, { label: "", variations: [] }]);
  const handleRemoveVariationGroup = (gi: number) => {
    const updated = [...variationGroups];
    updated.splice(gi, 1);
    setVariationGroups(updated);
  };
  const handleAddVariation = (gi: number) => {
    const updated = [...variationGroups];
    updated[gi].variations.push({ name: "", price: "" });
    setVariationGroups(updated);
  };
  const handleRemoveVariation = (gi: number, vi: number) => {
    const updated = [...variationGroups];
    updated[gi].variations.splice(vi, 1);
    setVariationGroups(updated);
  };
  const handleUpdateGroupLabel = (index: number, text: string) => {
    const updated = [...variationGroups];
    updated[index].label = text;
    setVariationGroups(updated);
  };
  const handleUpdateVariation = (gi: number, vi: number, field: "name" | "price", value: string) => {
    const updated = [...variationGroups];
    updated[gi].variations[vi][field] = value;
    setVariationGroups(updated);
  };

  // update API call: use multipart/form-data if imageIsNew (or can always use multipart)
  const handleUpdateMenu = async () => {
    // validation small
    if (!itemName.trim() || !price.trim()) {
      Alert.alert("Error", "Please fill in required fields");
      return;
    }

    try {
      const formattedVariations = variationGroups.map((g) => ({
        label: g.label,
        variations: g.variations.map((v) => ({ name: v.name, price: Number(v.price) || 0 })),
      }));

      const formData = new FormData();
      formData.append("item_name", itemName.trim());
      formData.append("price", String(price).trim());
      formData.append("category", category);
      formData.append("availability", String(availability));
      formData.append("variations", JSON.stringify(formattedVariations));

      if (imageIsNew && imageAsset?.uri) {
        formData.append("image", {
          uri: imageAsset.uri,
          name: imageAsset.fileName || `menu-${Date.now()}.jpg`,
          type: imageAsset.type || "image/jpeg",
        } as any);
      }

      await api.put(`/menu-item/${item.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Success", "Menu item updated successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("UpdateMenu error:", err.response?.data ?? err.message);
        Alert.alert("Error", err.response?.data?.message ?? "Failed to update item");
      } else if (err instanceof Error) {
        console.error(err.message);
        Alert.alert("Error", err.message);
      } else {
        console.error(err);
        Alert.alert("Error", "Unknown error occurred");
      }
    }
  };

  const handleDelete = async () => {
    Alert.alert("Confirm Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/menu-item/${item.id}`);
            Alert.alert("Deleted", "Menu item deleted", [{ text: "OK", onPress: () => navigation.goBack() }]);
          } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={{
            uri: imageUri ?? "https://cdn-icons-png.flaticon.com/512/9417/9417083.png",
          }}
          style={styles.image}
        />
      </TouchableOpacity>

      <Text style={styles.label}>Item Name *</Text>
      <TextInput style={styles.input} value={itemName} onChangeText={setItemName} />

      <Text style={styles.label}>Price *</Text>
      <TextInput style={styles.input} value={price} keyboardType="numeric" onChangeText={setPrice} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={category} onValueChange={setCategory}>
          <Picker.Item label="Beverage" value="Beverage" />
          <Picker.Item label="Snack" value="Snack" />
          <Picker.Item label="Meal" value="Meal" />
          <Picker.Item label="Dessert" value="Dessert" />
        </Picker>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.label}>Availability</Text>
        <Switch value={availability} onValueChange={setAvailability} trackColor={{ true: "darkred" }} />
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>Variations</Text>
      {variationGroups.map((group, gi) => (
        <View key={gi} style={styles.groupBox}>
          <TextInput style={styles.input} placeholder="Group label" value={group.label} onChangeText={(t) => handleUpdateGroupLabel(gi, t)} />

          {group.variations.map((v, vi) => (
            <View key={vi} style={styles.variationRow}>
              <TextInput style={[styles.input, styles.variationInput]} placeholder="Name" value={v.name} onChangeText={(t) => handleUpdateVariation(gi, vi, "name", t)} />
              <TextInput style={[styles.input, styles.priceInput]} placeholder="Price" keyboardType="numeric" value={v.price} onChangeText={(t) => handleUpdateVariation(gi, vi, "price", t)} />
              <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveVariation(gi, vi)}>
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity style={styles.smallButton} onPress={() => handleAddVariation(gi)}>
              <Text style={styles.smallButtonText}>+ Add Variation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.removeGroupButton} onPress={() => handleRemoveVariationGroup(gi)}>
              <Text style={styles.removeGroupButtonText}>Remove Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.buttonOutline} onPress={handleAddVariationGroup}>
        <Text style={styles.buttonOutlineText}>+ Add Variation Group</Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleUpdateMenu}><Text style={styles.buttonText}>Update</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: "gray" }]} onPress={handleDelete}><Text style={styles.buttonText}>Delete</Text></TouchableOpacity>
      </View>
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
  button: { flex: 1, backgroundColor: "darkred", padding: 14, borderRadius: 8, alignItems: "center", marginHorizontal: 5 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
