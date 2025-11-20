import React from "react";
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ImagePreviewModalProps {
  visible: boolean;
  imageUrl?: string | null;
  onClose: () => void;
  title?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  imageUrl,
  onClose,
  title,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdropTouchable}
          onPress={onClose}
        />
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <Text style={styles.title}>{title || "Image preview"}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {imageUrl ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.imageContainer}
              maximumZoomScale={3}
              minimumZoomScale={1}
              centerContent
            >
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
            </ScrollView>
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackText}>No image available</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ImagePreviewModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 16,
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrapper: {
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  imageContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  fallbackText: {
    color: "#aaa",
    fontSize: 14,
  },
});
