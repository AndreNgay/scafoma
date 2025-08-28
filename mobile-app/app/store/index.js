import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper functions for AsyncStorage
const saveToStorage = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
};

const getFromStorage = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error("Error getting from storage:", error);
    return null;
  }
};

const removeFromStorage = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing from storage:", error);
  }
};

const useStore = create((set) => ({
  theme: "light", // default until we load
  user: null,

  // Load persisted data
  loadStorage: async () => {
    const theme = (await getFromStorage("theme")) || "light";
    const userStr = await getFromStorage("user");
    const user = userStr ? JSON.parse(userStr) : null;

    set({ theme, user });
  },

  setTheme: async (value) => {
    await saveToStorage("theme", value);
    set({ theme: value });
  },

  setCredentials: async (user) => {
    await saveToStorage("user", JSON.stringify(user));
    set({ user });
  },

  signOut: async () => {
    await removeFromStorage("user");
    set({ user: null });
  },
}));

export default useStore;
