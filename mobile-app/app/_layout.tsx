import { Stack } from "expo-router";
import { useNotifications } from "./hooks/useNotifications";

export default function RootLayout() {
  useNotifications();
  
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "SCaFOMA-UB" }} />
    </Stack>
  );
}
