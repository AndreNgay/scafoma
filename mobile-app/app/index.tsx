import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import useStore from "./store";

// Screens
import SignIn from "./screens/auth/SignIn";
import SignUp from "./screens/auth/SignUp";
import Menu from "./screens/concessionaire/Menu/Menu";
import Profile from "./screens/Profile";
import Orders from "./screens/concessionaire/Order/OrderList";
import AddMenu from "./screens/concessionaire/Menu/AddMenu";
import EditMenu from "./screens/concessionaire/Menu/EditMenu";
import Concession from "./screens/concessionaire/Concession/Concession";
import MenuItems from "./screens/customer/MenuItems/MenuItems";
import MenuItemDetails from "./screens/customer/MenuItems/MenuItemDetails";
import Cart from "./screens/customer/Cart";
import ViewConcession from "./screens/customer/ViewConcession";


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MenuStackNav = createNativeStackNavigator();

function MenuManagementStack() {
  return (
    <MenuStackNav.Navigator>
      <MenuStackNav.Screen
        name="Menu Management"
        component={Menu}
        options={{ headerShown: false }}
      />
      <MenuStackNav.Screen
        name="Add Menu"
        component={AddMenu}
        options={{ title: "Add Menu Item" }}
      />
      <MenuStackNav.Screen
        name="Edit Menu"
        component={EditMenu}
        options={{ title: "Edit Menu Item" }}
      />
    </MenuStackNav.Navigator>
  );
}

function ConsessionaireConcessionStack() {
  return (
    <MenuStackNav.Navigator>
      <MenuStackNav.Screen
        name="Concession Management"
        component={Concession}
        options={{ headerShown: false }}
      />
    </MenuStackNav.Navigator>
  )
}

function MenuItemsStack() {
  return (
    <MenuStackNav.Navigator>
      <MenuStackNav.Screen
        name="View Menu Items"
        component={MenuItems}
        options={{ headerShown: false }}
      />
      <MenuStackNav.Screen
        name="Menu Item Details"
        component={MenuItemDetails}
        options={{ headerShown: false }}
      />
      <MenuStackNav.Screen
        name="View Concession"
        component={ViewConcession}
        options={{ headerShown: false }}
      />
    </MenuStackNav.Navigator>
  )
}


function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Menu Items" component={MenuItemsStack} />
      <Tab.Screen name="Cart" component={Cart} />
      <Tab.Screen name="Orders" component={Orders} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function ConcessionaireTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Order List" component={Orders} />
      <Tab.Screen name="Menu" component={MenuManagementStack} />
      <Tab.Screen name="Concession" component={ConsessionaireConcessionStack} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  const AuthStackNav = createNativeStackNavigator();
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="SignIn" component={SignIn} />
      <AuthStackNav.Screen name="SignUp" component={SignUp} />
    </AuthStackNav.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loadStorage } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await loadStorage();
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : user.role === "customer" ? (
        <Stack.Screen name="Customer" component={CustomerTabs} />
      ) : (
        <Stack.Screen name="Concessionaire" component={ConcessionaireTabs} />
      )}
    </Stack.Navigator>
  );
}
