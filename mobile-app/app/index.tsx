import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  BackHandler,
  Alert,
} from "react-native";
import { useNavigation, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import useStore from "./store";

// Screens
import SignIn from "./screens/auth/SignIn";
import SignUp from "./screens/auth/SignUp";
import Menu from "./screens/concessionaire/Menu/Menu";
import Profile from "./screens/Profile";
import EditMenu from "./screens/concessionaire/Menu/EditMenu";
import Concession from "./screens/concessionaire/Concession/Concession";
import MenuItems from "./screens/customer/MenuItems/MenuItems";
import MenuItemDetails from "./screens/customer/MenuItems/MenuItemDetails";
import ViewConcession from "./screens/customer/ViewConcession";
import CustomerOrders from "./screens/customer/Orders/CustomerOrders";
import Cart from "./screens/customer/Cart/Cart";
import OrderList from "./screens/concessionaire/Order/OrderList";
import ViewOrderCustomer from "./screens/customer/Orders/ViewOrderCustomer";
import ViewOrderConcessionaire from "./screens/concessionaire/Order/ViewOrderConcessionaire";
import AddMenu from "./screens/concessionaire/Menu/AddMenu";
import ViewMenu from "./screens/concessionaire/Menu/ViewMenu";

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
      <MenuStackNav.Screen
        name="View Menu"
        component={ViewMenu}
        options={{ title: "View Menu Item" }}
      />
    </MenuStackNav.Navigator>
  );
}

function ConcessionaireConcessionStack() {
  return (
    <MenuStackNav.Navigator>
      <MenuStackNav.Screen
        name="Concession Management"
        component={Concession}
        options={{ headerShown: false }}
      />
    </MenuStackNav.Navigator>
  );
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
  );
}

function OrdersStack() {
  return (
    <MenuStackNav.Navigator>
      <MenuStackNav.Screen
        name="Customer Orders"
        component={CustomerOrders}
        options={{ headerShown: false }}
      />
      <MenuStackNav.Screen
        name="View Order"
        component={ViewOrderCustomer}
        options={{ headerShown: false }}
      />
    </MenuStackNav.Navigator>
  );
}

function OrderListStack() {
  return (
    <MenuStackNav.Navigator>
      <MenuStackNav.Screen
        name="View Orders"
        component={OrderList}
        options={{ headerShown: false }}
      />
      <MenuStackNav.Screen
        name="View Order"
        component={ViewOrderConcessionaire}
        options={{ headerShown: false }}
      />
    </MenuStackNav.Navigator>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Menu Items" component={MenuItemsStack} />
      <Tab.Screen name="Cart" component={Cart} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function ConcessionaireTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Order List" component={OrderListStack} />
      <Tab.Screen name="Menu" component={MenuManagementStack} />
      <Tab.Screen name="Concession" component={ConcessionaireConcessionStack} />
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
  const navigation = useNavigation();

  useEffect(() => {
    const init = async () => {
      await loadStorage();
      setLoading(false);
    };
    init();
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true; // prevent exit
      } else {
        Alert.alert("Exit App", "Do you want to exit?", [
          { text: "Cancel", style: "cancel" },
          { text: "Yes", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

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
