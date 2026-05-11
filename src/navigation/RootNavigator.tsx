import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/tokens";
import type { CustomerTabParamList, RootStackParamList } from "./types";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { HomeMapScreen } from "../screens/customer/HomeMapScreen";
import { JobHistoryScreen } from "../screens/customer/JobHistoryScreen";
import { MyVehiclesScreen } from "../screens/customer/MyVehiclesScreen";
import { AccountScreen } from "../screens/customer/AccountScreen";
import { BookingFlowScreen } from "../screens/customer/BookingFlowScreen";
import { LiveTrackingScreen } from "../screens/customer/LiveTrackingScreen";
import { NotificationsScreen } from "../screens/customer/NotificationsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<CustomerTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.orange,
  },
};

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const map: Record<keyof CustomerTabParamList, keyof typeof Ionicons.glyphMap> = {
            HomeMap: "map",
            JobHistory: "document-text",
            MyVehicles: "car-sport",
            Account: "person",
          };
          const icon = map[route.name];
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeMap" component={HomeMapScreen} options={{ title: "Home" }} />
      <Tab.Screen name="JobHistory" component={JobHistoryScreen} options={{ title: "Jobs" }} />
      <Tab.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: "Vehicles" }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user } = useApp();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={CustomerTabs} />
            <Stack.Screen
              name="BookingFlow"
              component={BookingFlowScreen}
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
