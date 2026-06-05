import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../state/AppContext";
import { colors } from "../theme/tokens";
import type {
  CombinedStackParamList,
  CustomerTabParamList,
  OperatorTabParamList,
} from "./types";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { LandingScreen } from "../screens/auth/LandingScreen";
import { HomeMapScreen } from "../screens/customer/HomeMapScreen";
import { JobHistoryScreen } from "../screens/customer/JobHistoryScreen";
import { MyVehiclesScreen } from "../screens/customer/MyVehiclesScreen";
import { AccountScreen } from "../screens/customer/AccountScreen";
import { BookingFlowScreen } from "../screens/customer/BookingFlowScreen";
import { LiveTrackingScreen } from "../screens/customer/LiveTrackingScreen";
import { NotificationsScreen } from "../screens/customer/NotificationsScreen";
import { LegalScreen } from "../screens/shared/LegalScreen";
import { OperatorOnboardingScreen } from "../screens/partner/OperatorOnboardingScreen";
import { OperatorPendingApprovalScreen } from "../screens/partner/OperatorPendingApprovalScreen";
import { OperatorRejectedScreen } from "../screens/partner/OperatorRejectedScreen";
import { OperatorHomeScreen } from "../screens/partner/OperatorHomeScreen";
import { OperatorJobsScreen } from "../screens/partner/OperatorJobsScreen";
import { OperatorEarningsScreen } from "../screens/partner/OperatorEarningsScreen";
import { OperatorAccountScreen } from "../screens/partner/OperatorAccountScreen";
import { OperatorLiveJobScreen } from "../screens/partner/OperatorLiveJobScreen";
import { DriverInspectionScreen } from "../screens/partner/DriverInspectionScreen";
import { DEV_PAGES } from "../dev/pageNumbers";
import { withDevPageBadge } from "../dev/withDevPageBadge";

const Landing = withDevPageBadge(LandingScreen, DEV_PAGES.landing);
const Login = withDevPageBadge(LoginScreen, DEV_PAGES.login);
const Register = withDevPageBadge(RegisterScreen, DEV_PAGES.register);
const Legal = withDevPageBadge(LegalScreen, DEV_PAGES.legal);
const HomeMap = withDevPageBadge(HomeMapScreen, DEV_PAGES.homeMap);
const JobHistory = withDevPageBadge(JobHistoryScreen, DEV_PAGES.jobHistory);
const MyVehicles = withDevPageBadge(MyVehiclesScreen, DEV_PAGES.myVehicles);
const Account = withDevPageBadge(AccountScreen, DEV_PAGES.account);
const BookingFlow = withDevPageBadge(BookingFlowScreen, DEV_PAGES.bookingFlow);
const Notifications = withDevPageBadge(NotificationsScreen, DEV_PAGES.notifications);
const LiveTracking = withDevPageBadge(LiveTrackingScreen, DEV_PAGES.liveTracking);
const OperatorPending = withDevPageBadge(
  OperatorPendingApprovalScreen,
  DEV_PAGES.operatorPending,
);
const OperatorRejected = withDevPageBadge(OperatorRejectedScreen, DEV_PAGES.operatorRejected);
const OperatorHome = withDevPageBadge(OperatorHomeScreen, DEV_PAGES.operatorHome);
const OperatorJobs = withDevPageBadge(OperatorJobsScreen, DEV_PAGES.operatorJobs);
const OperatorEarnings = withDevPageBadge(OperatorEarningsScreen, DEV_PAGES.operatorEarnings);
const OperatorMore = withDevPageBadge(OperatorAccountScreen, DEV_PAGES.operatorMore);
const OperatorLiveJob = withDevPageBadge(OperatorLiveJobScreen, DEV_PAGES.operatorLiveJob);
const DriverInspection = withDevPageBadge(DriverInspectionScreen, DEV_PAGES.driverInspection);

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
      <CustomerTab.Screen name="HomeMap" component={HomeMap} options={{ title: "Home" }} />
      <CustomerTab.Screen name="JobHistory" component={JobHistory} options={{ title: "Jobs" }} />
      <CustomerTab.Screen name="MyVehicles" component={MyVehicles} options={{ title: "Vehicles" }} />
      <CustomerTab.Screen name="Account" component={Account} options={{ title: "Account" }} />
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
        component={OperatorHome}
        options={{ title: "Home", tabBarLabel: "Home" }}
      />
      <OperatorTab.Screen
        name="OpJobs"
        component={OperatorJobs}
        options={{ title: "Jobs", tabBarLabel: "Jobs" }}
      />
      <OperatorTab.Screen
        name="OpEarnings"
        component={OperatorEarnings}
        options={{ title: "Earnings", tabBarLabel: "Earnings" }}
      />
      <OperatorTab.Screen
        name="OpMore"
        component={OperatorMore}
        options={{ title: "More", tabBarLabel: "More" }}
      />
    </OperatorTab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Landing" component={Landing} />
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen name="Register" component={Register} />
      <AuthStack.Screen name="Legal" component={Legal} />
    </AuthStack.Navigator>
  );
}

function CustomerNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
      <CustomerStack.Screen name="MainTabs" component={CustomerTabs} />
      <CustomerStack.Screen
        name="BookingFlow"
        component={BookingFlow}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <CustomerStack.Screen
        name="Notifications"
        component={Notifications}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <CustomerStack.Screen name="LiveTracking" component={LiveTracking} />
      <CustomerStack.Screen name="Legal" component={Legal} />
    </CustomerStack.Navigator>
  );
}

function OperatorNavigator() {
  return (
    <OperatorStack.Navigator screenOptions={{ headerShown: false }}>
      <OperatorStack.Screen name="OperatorTabs" component={OperatorTabs} />
      <OperatorStack.Screen name="OperatorLiveJob" component={OperatorLiveJob} />
      <OperatorStack.Screen name="DriverInspection" component={DriverInspection} />
      <OperatorStack.Screen name="OperatorOnboarding" component={OperatorOnboardingScreen} />
      <OperatorStack.Screen name="OperatorPending" component={OperatorPending} />
      <OperatorStack.Screen name="OperatorRejected" component={OperatorRejected} />
      <OperatorStack.Screen name="Legal" component={Legal} />
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
