import { NavigatorScreenParams } from "@react-navigation/native";

export type CustomerTabParamList = {
  HomeMap: undefined;
  JobHistory: undefined;
  MyVehicles: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: NavigatorScreenParams<CustomerTabParamList> | undefined;
  BookingFlow: { pickupLabel?: string; dropoffLabel?: string } | undefined;
  LiveTracking: undefined;
  Notifications: undefined;
};
