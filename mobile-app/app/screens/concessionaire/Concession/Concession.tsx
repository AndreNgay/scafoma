import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Switch,
  ScrollView,
  TextInput,
  Button,
  Alert,
} from "react-native";
import api from "../../../libs/apiCall";

type Concession = {
  id: number;
  concession_name: string;
  image_url?: string;
  cafeteria_name: string;
  location: string;
  gcash_payment_available: boolean;
  oncounter_payment_available: boolean;
  gcash_number?: string;
};

const Concession = () => {
  const [concession, setConcession] = useState<Concession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConcession = async () => {
    try {
      const res = await api.get("/concession");
      setConcession(res.data.data);
    } catch (error) {
      console.error("Error fetching concession:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!concession) return;
    setSaving(true);
    try {
      const res = await api.put("/concession/me", concession);

      // keep cafeteria_name & location if backend does not return them
      setConcession({
        ...concession,
        ...res.data.data,
        cafeteria_name: res.data.data.cafeteria_name || concession.cafeteria_name,
        location: res.data.data.location || concession.location,
      });

      Alert.alert("Success", "Concession updated successfully");
    } catch (err) {
      console.error("Error updating concession:", err);
      Alert.alert("Error", "Failed to update concession");
    } finally {
      setSaving(false);
    }
  };


  useEffect(() => {
    fetchConcession();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="darkred" />
      </View>
    );
  }

  if (!concession) {
    return (
      <View style={styles.center}>
        <Text>No concession found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Image */}
      {concession.image_url ? (
        <Image source={{ uri: concession.image_url }} style={styles.image} />
      ) : (
        <Image
          source={{
            uri: "https://static.thenounproject.com/png/3985543-200.png",
          }}
          style={styles.image}
        />
      )}

      {/* Editable Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Concession Name</Text>
        <TextInput
          style={styles.input}
          value={concession.concession_name}
          onChangeText={(text) =>
            setConcession({ ...concession, concession_name: text })
          }
        />

        <Text style={styles.label}>Image URL</Text>
        <TextInput
          style={styles.input}
          value={concession.image_url || ""}
          placeholder="https://example.com/myimage.jpg"
          onChangeText={(text) =>
            setConcession({ ...concession, image_url: text })
          }
        />

        <Text style={styles.label}>Cafeteria</Text>
        <TextInput
          style={[styles.input, { backgroundColor: "#f0f0f0" }]}
          value={concession.cafeteria_name}
          editable={false}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={[styles.input, { backgroundColor: "#f0f0f0" }]}
          value={concession.location}
          editable={false}
        />

        {/* Toggles */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>GCash Payment</Text>
          <Switch
            value={concession.gcash_payment_available}
            onValueChange={(val) =>
              setConcession({ ...concession, gcash_payment_available: val })
            }
            trackColor={{ true: "darkred" }}
            thumbColor={concession.gcash_payment_available ? "#fff" : "#f4f3f4"}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>On-Counter Payment</Text>
          <Switch
            value={concession.oncounter_payment_available}
            onValueChange={(val) =>
              setConcession({ ...concession, oncounter_payment_available: val })
            }
            trackColor={{ true: "darkred" }}
            thumbColor={
              concession.oncounter_payment_available ? "#fff" : "#f4f3f4"
            }
          />
        </View>

        <Text style={styles.label}>GCash Number</Text>
        <TextInput
          style={styles.input}
          value={concession.gcash_number || ""}
          placeholder="09XXXXXXXXX"
          onChangeText={(text) =>
            setConcession({ ...concession, gcash_number: text })
          }
        />

        <Button
          title={saving ? "Saving..." : "Save Changes"}
          color="darkred"
          onPress={handleSave}
          disabled={saving}
        />
      </View>
    </ScrollView>
  );
};

export default Concession;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 16,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
    width: "100%",
    elevation: 2,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginTop: 10,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  toggleLabel: {
    fontSize: 15,
    color: "#444",
  },
});
