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
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import api from "../../../libs/apiCall";

type Variation = { name: string; price: string };
type VariationGroup = { label: string; variations: Variation[] };

const AddMenu: React.FC = () => {
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Beverage");
  const [availability, setAvailability] = useState(true);
  const [image, setImage] = useState<any>(null);
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Tooltip states
  const [showTooltipPrice, setShowTooltipPrice] = useState(false);
  const [showTooltipAvailability, setShowTooltipAvailability] = useState(false);
  const [showTooltipVariations, setShowTooltipVariations] = useState(false);

  const navigation = useNavigation<any>();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const addVariationGroup = () =>
    setVariationGroups([...variationGroups, { label: "", variations: [] }]);
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

  const handleAddMenu = async () => {
    if (!itemName.trim() || !price.trim()) {
      Alert.alert("Error", "Please fill in item name and price.");
      return;
    }

    const formData = new FormData();
    formData.append("item_name", itemName.trim());
    formData.append("price", price.trim());
    formData.append("category", category);
    formData.append("availability", availability ? "true" : "false");
    formData.append("variations", JSON.stringify(variationGroups));

    if (image?.uri) {
      formData.append("image", {
        uri: image.uri,
        type: "image/jpeg",
        name: `menu-${Date.now()}.jpg`,
      } as any);
    }

    try {
      setLoading(true);
      await api.post("/menu-item", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Success", "Menu item added successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      console.error(err);
      Alert.alert("Error", "Failed to add menu item.");
    } finally {
      setLoading(false);
    }
  };

  const Tooltip = ({ visible, text }: { visible: boolean; text: string }) =>
    visible ? <Text style={styles.tooltipText}>{text}</Text> : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <Text style={styles.label}>Item Name *</Text>
      <TextInput style={styles.input} value={itemName} onChangeText={setItemName} />

      <View style={styles.labelRow}>
        <Text style={styles.label}>Base Price *</Text>
        <TouchableOpacity onPress={() => setShowTooltipPrice(!showTooltipPrice)}>
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
      <Tooltip
        visible={showTooltipPrice}
        text="This is the base price of the menu item."
      />
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

      <View style={styles.labelRow}>
        <Text style={styles.label}>Availability</Text>
        <TouchableOpacity onPress={() => setShowTooltipAvailability(!showTooltipAvailability)}>
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
      <Tooltip
        visible={showTooltipAvailability}
        text="Toggle to set if this menu item is available for ordering."
      />
      <View style={styles.toggleRow}>
        <Switch
          value={availability}
          onValueChange={setAvailability}
          trackColor={{ false: "#ccc", true: "#A40C2D" }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.labelRow}>
        <Text style={[styles.label, { marginTop: 18 }]}>Variations</Text>
        <TouchableOpacity onPress={() => setShowTooltipVariations(!showTooltipVariations)}>
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
      <Tooltip
        visible={showTooltipVariations}
        text="Add groups and variations like sizes or flavors with additional prices."
      />

      {variationGroups.map((group, gIndex) => (
        <View key={gIndex} style={styles.groupBox}>
          <TextInput
            style={styles.input}
            placeholder="Group label (e.g. Size)"
            value={group.label}
            onChangeText={(t) => updateGroupLabel(gIndex, t)}
          />

          {group.variations.map((v, vIndex) => (
            <View key={vIndex} style={styles.variationRow}>
              <TextInput
                style={[styles.input, styles.variationInput]}
                placeholder="Name"
                value={v.name}
                onChangeText={(t) => updateVariation(gIndex, vIndex, "name", t)}
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Additional price"
                keyboardType="numeric"
                value={v.price}
                onChangeText={(t) => updateVariation(gIndex, vIndex, "price", t)}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeVariation(gIndex, vIndex)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity style={styles.smallButton} onPress={() => addVariation(gIndex)}>
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
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoIcon: { fontSize: 16, color: "#555" },
  tooltipText: { fontSize: 12, color: "#555", marginTop: 2, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "#fff",
  },
  pickerWrapper: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginTop: 6 },
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
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 6,
  },
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
  button: { backgroundColor: "darkred", padding: 14, borderRadius: 8, marginTop: 20, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
