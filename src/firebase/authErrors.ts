/** Maps Firebase Auth error codes to user-friendly messages. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Sign in instead?";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment then try again.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled. Contact support.";
    default:
      return "Something went wrong. Please try again.";
  }
}
