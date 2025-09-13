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
import axios from "axios"; // for type checking

const AddMenu = () => {
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<any>(null);
  const [category, setCategory] = useState("Beverage");

  const [variationGroups, setVariationGroups] = useState<
    { label: string; variations: { name: string; price: string }[] }[]
  >([]);

  const navigation = useNavigation<any>();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0]); // store selected image
    }
  };

const handleAddMenu = async () => {
  if (!itemName || !price) {
    Alert.alert("Error", "Please fill in all required fields.");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("item_name", itemName.trim());
    formData.append("price", String(price).trim());   // force string
    formData.append("category", category.trim());

    if (image) {
      formData.append("image", {
        uri: image.uri,
        type: "image/jpeg",
        name: "menu-item.jpg",
      } as any);
    }

    formData.append("variations", JSON.stringify(variationGroups));

    await api.post("/menu-item", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    Alert.alert("Success", "Menu item added successfully!", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error("Error adding menu item:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to add menu item.");
    } else if (err instanceof Error) {
      console.error("Error adding menu item:", err.message);
      Alert.alert("Error", err.message);
    } else {
      console.error("Unknown error:", err);
      Alert.alert("Error", "An unknown error occurred.");
    }
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
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  button: {
    backgroundColor: "darkred",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
