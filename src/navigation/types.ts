import { NavigatorScreenParams } from "@react-navigation/native";

export type LegalKind = "terms" | "privacy" | "operator_contract";

export type CustomerTabParamList = {
  HomeMap: undefined;
  JobHistory: undefined;
  MyVehicles: undefined;
  Account: undefined;
};

/** Single navigator param list covering auth / customer / operator stacks. */
export type CombinedStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  Legal: { kind: LegalKind };
  MainTabs: NavigatorScreenParams<CustomerTabParamList> | undefined;
  BookingFlow:
    | {
        pickupLabel?: string;
        dropoffLabel?: string;
        /** Road miles for quote when resolved on home map */
        roadMiles?: number;
        onMotorway?: boolean;
        pickupLat?: number;
        pickupLng?: number;
        dropoffLat?: number;
        dropoffLng?: number;
      }
    | undefined;
  LiveTracking: { jobId?: string } | undefined;
  Notifications: undefined;
  OperatorOnboarding: undefined;
  OperatorPending: undefined;
  OperatorRejected: undefined;
  OperatorTabs: undefined;
  OperatorLiveJob: { jobId?: string } | undefined;
};

export type RootStackParamList = CombinedStackParamList;

export type OperatorTabParamList = {
  OpHome: undefined;
  OpJobs: undefined;
  OpEarnings: undefined;
  OpMore: undefined;
};
