import { Stack } from "expo-router";
import { useNotifications } from "./hooks/useNotifications";
import { ToastProvider } from "./contexts/ToastContext";

export default function RootLayout() {
  useNotifications();

  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ title: "SCaFOMA-UB" }} />
      </Stack>
    </ToastProvider>
  );
}
