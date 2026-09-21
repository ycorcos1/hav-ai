import { ProfileScreen } from "@/features/profile/screens/ProfileScreen";
import {
  loadCurrentProfileSettings,
  prepareSafeLogout,
  trySyncAndLogout,
  updateCurrentProfileSettings,
} from "@/features/profile/services/profileApplication";

export default function ProfileRoute() {
  return (
    <ProfileScreen
      loadProfile={loadCurrentProfileSettings}
      prepareLogout={prepareSafeLogout}
      trySyncAndLogout={trySyncAndLogout}
      updateProfile={updateCurrentProfileSettings}
    />
  );
}
