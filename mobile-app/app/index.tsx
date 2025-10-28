import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
import MenuItemDetails from "./screens/customer/MenuItems/MenuItemDetails";
import ViewConcession from "./screens/customer/ViewConcession";
import Home from "./screens/customer/Home";
import CustomerOrders from "./screens/customer/Orders/CustomerOrders";
import Cart from "./screens/customer/Cart/Cart";
import OrderList from "./screens/concessionaire/Order/OrderList";
import ViewOrderCustomer from "./screens/customer/Orders/ViewOrderCustomer";
import ViewOrderConcessionaire from "./screens/concessionaire/Order/ViewOrderConcessionaire";
import ViewCustomerProfile from "./screens/concessionaire/Order/ViewCustomerProfile";
import AddMenu from "./screens/concessionaire/Menu/AddMenu";
import ViewMenu from "./screens/concessionaire/Menu/ViewMenu";
import Notifications from "./screens/Notifications";
import ForgotPassword from "./screens/auth/ForgotPassword";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MenuStackNav = createNativeStackNavigator();

function MenuManagementStack() {
  return (
    <MenuStackNav.Navigator initialRouteName="Menu Management">
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
    <MenuStackNav.Navigator initialRouteName="Concession Management">
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
    <MenuStackNav.Navigator initialRouteName="View Menu Items">
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
    <MenuStackNav.Navigator initialRouteName="Customer Orders">
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
    <MenuStackNav.Navigator initialRouteName="View Orders">
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
      <MenuStackNav.Screen
        name="View Customer Profile"
        component={ViewCustomerProfile}
        options={{ headerShown: false }}
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
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
        },
        tabBarActiveTintColor: '#A40C2D',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }} 
      initialRouteName="Home"
    >
      <Tab.Screen 
        name="Home" 
        component={Home}
        options={{
          title: "",
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu Items"
        component={MenuItemsStack}
        options={{
          title: "",
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Ensure the nested stack shows the root list screen
            navigation.navigate("Menu Items", { screen: "View Menu Items" });
          },
        })}
      />
      <Tab.Screen 
        name="Cart" 
        component={Cart}
        options={{
          title: "",
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersStack}
        options={{
          title: "",
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={Notifications}
        options={{
          title: "",
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications" size={size} color={color} />
              {notificationCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
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
          title: "",
          tabBarLabel: 'Profile',
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
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
        },
        tabBarActiveTintColor: '#A40C2D',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }} 
      initialRouteName="Order List"
    >
      <Tab.Screen 
        name="Order List" 
        component={OrderListStack}
        options={{
          title: "",
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Menu" 
        component={MenuManagementStack}
        options={{
          title: "",
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Concession" 
        component={ConcessionaireConcessionStack}
        options={{
          title: "",
          tabBarLabel: 'Concession',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={Notifications}
        options={{
          title: "",
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications" size={size} color={color} />
              {notificationCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
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
          title: "",
          tabBarLabel: 'Profile',
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
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={!user ? "Auth" : user.role === "customer" ? "Customer" : "Concessionaire"}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} options={{ title: "" }} />
      ) : user.role === "customer" ? (
        <Stack.Screen name="Customer" component={CustomerTabs} options={{ title: "" }} />
      ) : (
        <Stack.Screen name="Concessionaire" component={ConcessionaireTabs} options={{ title: "" }} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#A40C2D',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
