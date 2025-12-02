import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { NavigationContainer, CommonActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import useStore from "./store";
import api from "./libs/apiCall";

// Screens
import SignIn from "./screens/auth/SignIn";
import SignUp from "./screens/auth/SignUp";
import Menu from "./screens/concessionaire/Menu/Menu";
import Profile from "./screens/Profile";
import EditMenu from "./screens/concessionaire/Menu/EditMenu";
import Concession from "./screens/concessionaire/Concession/Concession";
import MenuItems from "./screens/customer/MenuItems/MenuItems";
import FullConcessionMenu from "./screens/customer/MenuItems/FullConcessionMenu";
import MenuItemDetails from "./screens/customer/MenuItems/MenuItemDetails";
import ViewConcession from "./screens/customer/ViewConcession";
import Home from './screens/customer/Home'
import CustomerOrders from './screens/customer/Orders/CustomerOrders'
import Cart from './screens/customer/Cart/Cart'
import OrderList from './screens/concessionaire/Order/OrderList'
import ViewOrderCustomer from './screens/customer/Orders/ViewOrderCustomer'
import ViewOrderConcessionaire from './screens/concessionaire/Order/ViewOrderConcessionaire'
import ViewCustomerProfile from './screens/concessionaire/Order/ViewCustomerProfile'
import ViewConcessionaireProfile from './screens/customer/Orders/ViewConcessionaireProfile'
import AddMenu from './screens/concessionaire/Menu/AddMenu'
import ViewMenu from './screens/concessionaire/Menu/ViewMenu'
import Notifications from './screens/Notifications'
import ForgotPassword from './screens/auth/ForgotPassword'
import { useNotifications } from "./hooks/useNotifications";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MenuStackNav = createNativeStackNavigator();

function MenuManagementStack() {
  return (
    <MenuStackNav.Navigator initialRouteName="Menu Management">
      <MenuStackNav.Screen
        name="Menu Management"
        component={Menu}
        options={{ title: "Menu" }}
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
    <MenuStackNav.Navigator initialRouteName="Concession Management">
      <MenuStackNav.Screen
        name="Concession Management"
        component={Concession}
        options={{ title: "Concession" }}
      />
    </MenuStackNav.Navigator>
  );
}

function MenuItemsStack() {
  return (
    <MenuStackNav.Navigator initialRouteName="View Menu Items">
      <MenuStackNav.Screen
        name="View Menu Items"
        component={MenuItems}
        options={{ title: "Menu" }}
      />
      <MenuStackNav.Screen
        name="Full Concession Menu"
        component={FullConcessionMenu}
        options={{ title: "Menu" }}
      />
      <MenuStackNav.Screen
        name="Menu Item Details"
        component={MenuItemDetails}
        options={{ title: "Menu Item Details" }}
      />
      <MenuStackNav.Screen
        name="View Concession"
        component={ViewConcession}
        options={{ title: "Concession" }}
      />
    </MenuStackNav.Navigator>
  );
}

function OrdersStack() {
  return (
    <MenuStackNav.Navigator initialRouteName="Customer Orders">
      <MenuStackNav.Screen
        name="Customer Orders"
        component={CustomerOrders}
        options={{ title: "Orders" }}
      />
      <MenuStackNav.Screen
        name="View Order"
        component={ViewOrderCustomer}
        options={{ title: "Order Details" }}
      />
      <MenuStackNav.Screen
        name="View Concessionaire Profile"
        component={ViewConcessionaireProfile}
        options={{ title: "Concessionaire Profile" }}
      />
    </MenuStackNav.Navigator>
  );
}

function OrderListStack() {
  return (
    <MenuStackNav.Navigator initialRouteName="View Orders">
      <MenuStackNav.Screen
        name="View Orders"
        component={OrderList}
        options={{ title: "Orders" }}
      />
      <MenuStackNav.Screen
        name="View Order"
        component={ViewOrderConcessionaire}
        options={{ title: "Order Details" }}
      />
      <MenuStackNav.Screen
        name="View Customer Profile"
        component={ViewCustomerProfile}
        options={{ title: "Customer Profile" }}
      />
    </MenuStackNav.Navigator>
  );
}

function CustomerTabs() {
  const { user } = useStore();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return;
      try {
        const res = await api.get(`/notification/${user.id}/unread-count`);
        setNotificationCount(res.data.count || 0);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        title: "",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e0e0e0",
        },
        tabBarActiveTintColor: "#A40C2D",
        tabBarInactiveTintColor: "#666",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
      initialRouteName="Home"
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          headerShown: true,
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu Items"
        component={MenuItemsStack}
        options={{
          title: "Menu",
          tabBarLabel: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const menuItemsTab = state.routes.find(
              (r) => r.name === "Menu Items",
            );

            // If we're already on this tab and the stack has multiple screens, reset to root
            const nestedIndex = menuItemsTab?.state?.index ?? 0;
            if (nestedIndex > 0) {
              e.preventDefault();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "Menu Items",
                      state: {
                        routes: [{ name: "View Menu Items" }],
                        index: 0,
                      },
                    },
                  ],
                }),
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Cart"
        component={Cart}
        options={{
          headerShown: true,
          title: "Cart",
          tabBarLabel: "Cart",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersStack}
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Orders", { screen: "Customer Orders" });
          },
        })}
      />
      <Tab.Screen
        name="Notifications"
        component={Notifications}
        options={{
          headerShown: true,
          title: "Notifications",
          tabBarLabel: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications" size={size} color={color} />
              {notificationCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: () => setNotificationCount(0),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          headerShown: true,
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function ConcessionaireTabs() {
  const { user } = useStore();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return;
      try {
        const res = await api.get(`/notification/${user.id}/unread-count`);
        setNotificationCount(res.data.count || 0);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        title: "",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e0e0e0",
        },
        tabBarActiveTintColor: "#A40C2D",
        tabBarInactiveTintColor: "#666",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
      initialRouteName="Order List"
    >
      <Tab.Screen
        name="Order List"
        component={OrderListStack}
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const orderListTab = state.routes.find(
              (r) => r.name === "Order List",
            );

            // If we're already on this tab and the stack has multiple screens, reset to root
            const nestedIndex = orderListTab?.state?.index ?? 0;
            if (nestedIndex > 0) {
              e.preventDefault();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "Order List",
                      state: {
                        routes: [{ name: "View Orders" }],
                        index: 0,
                      },
                    },
                  ],
                }),
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Menu"
        component={MenuManagementStack}
        options={{
          title: "Menu",
          tabBarLabel: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const menuTab = state.routes.find((r) => r.name === "Menu");

            // If we're already on this tab and the stack has multiple screens, reset to root
            const nestedIndex = menuTab?.state?.index ?? 0;
            if (nestedIndex > 0) {
              e.preventDefault();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "Menu",
                      state: {
                        routes: [{ name: "Menu Management" }],
                        index: 0,
                      },
                    },
                  ],
                }),
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Concession"
        component={ConcessionaireConcessionStack}
        options={{
          title: "Concession",
          tabBarLabel: "Concession",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const concessionTab = state.routes.find(
              (r) => r.name === "Concession",
            );

            // If we're already on this tab and the stack has multiple screens, reset to root
            const nestedIndex = concessionTab?.state?.index ?? 0;
            if (nestedIndex > 0) {
              e.preventDefault();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "Concession",
                      state: {
                        routes: [{ name: "Concession Management" }],
                        index: 0,
                      },
                    },
                  ],
                }),
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Notifications"
        component={Notifications}
        options={{
          headerShown: true,
          title: "Notifications",
          tabBarLabel: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications" size={size} color={color} />
              {notificationCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: () => setNotificationCount(0),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          headerShown: true,
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  const AuthStackNav = createNativeStackNavigator();
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="SignIn" component={SignIn} />
      <AuthStackNav.Screen name="SignUp" component={SignUp} />
      <AuthStackNav.Screen name="ForgotPassword" component={ForgotPassword} />
    </AuthStackNav.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loadStorage } = useStore();
  const [loading, setLoading] = useState(true);

  // Enable cross-role notification polling/local notifications
  useNotifications();

  useEffect(() => {
    const init = async () => {
      await loadStorage();
      setLoading(false);
    };
    init();
  }, []);

  // Use default React Navigation Android back behavior (navigate back or exit at root)

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={
        !user
          ? "Auth"
          : user.role === "customer"
            ? "Customer"
            : "Concessionaire"
      }
    >
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={AuthStack}
          options={{ title: "" }}
        />
      ) : user.role === "customer" ? (
        <Stack.Screen
          name="Customer"
          component={CustomerTabs}
          options={{ title: "" }}
        />
      ) : (
        <Stack.Screen
          name="Concessionaire"
          component={ConcessionaireTabs}
          options={{ title: "" }}
        />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    top: -5,
    right: -8,
    backgroundColor: "#A40C2D",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
});
