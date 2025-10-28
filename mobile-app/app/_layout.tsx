import { Stack } from "expo-router";
import { useNotifications } from "./hooks/useNotifications";

export default function RootLayout() {
  useNotifications();
  
  return <Stack />;
}
