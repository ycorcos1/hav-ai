import { ProfileScreen } from "@/features/profile/screens/ProfileScreen";
import {
  loadCurrentProfileSettings,
  updateCurrentProfileSettings,
} from "@/features/profile/services/profileApplication";

export default function ProfileRoute() {
  return (
    <ProfileScreen
      loadProfile={loadCurrentProfileSettings}
      updateProfile={updateCurrentProfileSettings}
    />
  );
}
