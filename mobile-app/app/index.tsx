// index.tsx
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import useStore from "./store/index";

// Screens
import SignIn from "./screens/auth/SignIn";
import SignUp from "./screens/auth/SignUp";
import Orders from "./screens/concessionaire/Orders";
import Menu from "./screens/customer/Menu";
import Profile from "./screens/customer/Profile";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tabs for concessionaire
function ConcessionaireTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Orders" component={Orders} />
    </Tab.Navigator>
  );
}

// Tabs for customer
function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Menu" component={Menu} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export default function Index() {
  const { user } = useStore((state) => state);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="SignUp" component={SignUp} />
        </>
      ) : user.role === "concessionaire" ? (
        <Stack.Screen name="ConcessionaireRoot" component={ConcessionaireTabs} />
      ) : (
        <Stack.Screen name="CustomerRoot" component={CustomerTabs} />
      )}
    </Stack.Navigator>
  );
}
