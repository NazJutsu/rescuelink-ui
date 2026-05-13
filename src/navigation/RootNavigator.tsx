import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/tokens";
import type {
  CombinedStackParamList,
  CustomerTabParamList,
  OperatorTabParamList,
} from "./types";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { HomeMapScreen } from "../screens/customer/HomeMapScreen";
import { JobHistoryScreen } from "../screens/customer/JobHistoryScreen";
import { MyVehiclesScreen } from "../screens/customer/MyVehiclesScreen";
import { AccountScreen } from "../screens/customer/AccountScreen";
import { BookingFlowScreen } from "../screens/customer/BookingFlowScreen";
import { LiveTrackingScreen } from "../screens/customer/LiveTrackingScreen";
import { NotificationsScreen } from "../screens/customer/NotificationsScreen";
import { LegalScreen } from "../screens/legal/LegalScreen";
import { OperatorOnboardingScreen } from "../screens/operator/OperatorOnboardingScreen";
import { OperatorPendingApprovalScreen } from "../screens/operator/OperatorPendingApprovalScreen";
import { OperatorRejectedScreen } from "../screens/operator/OperatorRejectedScreen";
import { OperatorHomeScreen } from "../screens/operator/OperatorHomeScreen";
import { OperatorJobsScreen } from "../screens/operator/OperatorJobsScreen";
import { OperatorEarningsScreen } from "../screens/operator/OperatorEarningsScreen";
import { OperatorAccountScreen } from "../screens/operator/OperatorAccountScreen";
import { OperatorLiveJobScreen } from "../screens/operator/OperatorLiveJobScreen";

const CustomerTab = createBottomTabNavigator<CustomerTabParamList>();
const OperatorTab = createBottomTabNavigator<OperatorTabParamList>();

const AuthStack = createNativeStackNavigator<CombinedStackParamList>();
const CustomerStack = createNativeStackNavigator<CombinedStackParamList>();
const OperatorStack = createNativeStackNavigator<CombinedStackParamList>();

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
    <CustomerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const map: Record<
            keyof CustomerTabParamList,
            keyof typeof Ionicons.glyphMap
          > = {
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
      <CustomerTab.Screen name="HomeMap" component={HomeMapScreen} options={{ title: "Home" }} />
      <CustomerTab.Screen name="JobHistory" component={JobHistoryScreen} options={{ title: "Jobs" }} />
      <CustomerTab.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: "Vehicles" }} />
      <CustomerTab.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
    </CustomerTab.Navigator>
  );
}

function OperatorTabs() {
  return (
    <OperatorTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color, size }) => {
          const map: Record<
            keyof OperatorTabParamList,
            keyof typeof Ionicons.glyphMap
          > = {
            OpHome: "home-outline",
            OpJobs: "list-outline",
            OpEarnings: "cash-outline",
            OpMore: "menu-outline",
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <OperatorTab.Screen
        name="OpHome"
        component={OperatorHomeScreen}
        options={{ title: "Home", tabBarLabel: "Home" }}
      />
      <OperatorTab.Screen
        name="OpJobs"
        component={OperatorJobsScreen}
        options={{ title: "Jobs", tabBarLabel: "Jobs" }}
      />
      <OperatorTab.Screen
        name="OpEarnings"
        component={OperatorEarningsScreen}
        options={{ title: "Earnings", tabBarLabel: "Earnings" }}
      />
      <OperatorTab.Screen
        name="OpMore"
        component={OperatorAccountScreen}
        options={{ title: "More", tabBarLabel: "More" }}
      />
    </OperatorTab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Legal" component={LegalScreen} />
    </AuthStack.Navigator>
  );
}

function CustomerNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
      <CustomerStack.Screen name="MainTabs" component={CustomerTabs} />
      <CustomerStack.Screen
        name="BookingFlow"
        component={BookingFlowScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <CustomerStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <CustomerStack.Screen name="LiveTracking" component={LiveTrackingScreen} />
      <CustomerStack.Screen name="Legal" component={LegalScreen} />
    </CustomerStack.Navigator>
  );
}

function OperatorNavigator() {
  const { operatorProfile } = useApp();
  const ver = operatorProfile?.verificationStatus;
  const phase =
    ver === "approved"
      ? "approved"
      : ver === "pending_review"
        ? "pending_review"
        : ver === "rejected"
          ? "rejected"
          : "incomplete_docs";

  return (
    <OperatorStack.Navigator
      key={phase}
      screenOptions={{ headerShown: false }}
    >
      {phase === "approved" ? (
        <>
          <OperatorStack.Screen name="OperatorTabs" component={OperatorTabs} />
          <OperatorStack.Screen name="OperatorLiveJob" component={OperatorLiveJobScreen} />
        </>
      ) : phase === "pending_review" ? (
        <OperatorStack.Screen name="OperatorPending" component={OperatorPendingApprovalScreen} />
      ) : phase === "rejected" ? (
        <OperatorStack.Screen name="OperatorRejected" component={OperatorRejectedScreen} />
      ) : (
        <OperatorStack.Screen name="OperatorOnboarding" component={OperatorOnboardingScreen} />
      )}
      <OperatorStack.Screen name="Legal" component={LegalScreen} />
    </OperatorStack.Navigator>
  );
}

export function RootNavigator() {
  const { user } = useApp();

  return (
    <NavigationContainer theme={navTheme}>
      {user == null ? (
        <AuthNavigator />
      ) : user.role === "customer" ? (
        <CustomerNavigator />
      ) : (
        <OperatorNavigator />
      )}
    </NavigationContainer>
  );
}
