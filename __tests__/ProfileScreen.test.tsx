import { fireEvent, render } from "@testing-library/react-native";

import { ProfileScreen } from "@/features/profile/screens/ProfileScreen";
import type { ProfileSettings } from "@/features/profile/services/profileApplication";

const settings: ProfileSettings = {
  email: "athlete@example.com",
  profile: {
    userId: "11111111-1111-4111-8111-111111111111",
    weightUnit: "lb",
    primaryGoal: "hybrid",
    rpePreference: "optional",
    progressionStyle: "balanced",
    defaultRestDurationSeconds: 120,
    onboardingCompleted: true,
    createdAt: "2026-09-21T12:00:00.000Z",
    updatedAt: "2026-09-21T12:00:00.000Z",
  },
};

describe("ProfileScreen", () => {
  it("shows current training preferences and account information", async () => {
    const screen = await render(
      <ProfileScreen loadProfile={async () => settings} />,
    );

    expect(await screen.findByText("Training Preferences")).toBeOnTheScreen();
    expect(screen.getByLabelText("Units: Pounds (lb)")).toBeOnTheScreen();
    expect(screen.getByLabelText("Primary Goal: Both")).toBeOnTheScreen();
    expect(screen.getByLabelText("RPE Preference: Optional")).toBeOnTheScreen();
    expect(screen.getByLabelText("Progression Style: Balanced")).toBeOnTheScreen();
    expect(screen.getByLabelText("Default Rest: 120 seconds")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email: athlete@example.com")).toBeOnTheScreen();
    expect(screen.getByText(/V1 is designed for one active device at a time/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Logout" })).toBeDisabled();
  });

  it("retries a sanitized loading failure", async () => {
    const loadProfile = jest.fn()
      .mockRejectedValueOnce(new Error("raw provider detail"))
      .mockResolvedValueOnce(settings);
    const screen = await render(
      <ProfileScreen loadProfile={loadProfile} />,
    );

    expect(await screen.findByText("Your profile settings could not be loaded.")).toBeOnTheScreen();
    expect(screen.queryByText("raw provider detail")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByText("Training Preferences")).toBeOnTheScreen();
    expect(loadProfile).toHaveBeenCalledTimes(2);
  });

  it("changes only the unit preference and updates display values", async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      ...settings.profile,
      weightUnit: "kg",
      updatedAt: "2026-09-21T12:05:00.000Z",
    });
    const screen = await render(
      <ProfileScreen loadProfile={async () => settings} updateProfile={updateProfile} />,
    );

    expect(await screen.findByLabelText("Units: Pounds (lb)")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Use Kilograms (kg)" }));
    expect(await screen.findByLabelText("Units: Kilograms (kg)")).toBeOnTheScreen();
    expect(updateProfile).toHaveBeenCalledWith({ weightUnit: "kg" });
    expect(screen.getByLabelText("Primary Goal: Both")).toBeOnTheScreen();
  });

  it("keeps the prior unit visible when the update fails", async () => {
    const screen = await render(
      <ProfileScreen
        loadProfile={async () => settings}
        updateProfile={jest.fn().mockRejectedValue(new Error("raw update detail"))}
      />,
    );

    expect(await screen.findByLabelText("Units: Pounds (lb)")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Use Kilograms (kg)" }));
    expect(await screen.findByText("Your training preference could not be saved. Nothing else was changed.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Units: Pounds (lb)")).toBeOnTheScreen();
    expect(screen.queryByText("raw update detail")).toBeNull();
  });

  it("changes only future RPE input preference", async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      ...settings.profile,
      rpePreference: "preferred",
    });
    const screen = await render(
      <ProfileScreen loadProfile={async () => settings} updateProfile={updateProfile} />,
    );

    expect(await screen.findByLabelText("RPE Preference: Optional")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "RPE Preferred" }));
    expect(await screen.findByLabelText("RPE Preference: Preferred")).toBeOnTheScreen();
    expect(updateProfile).toHaveBeenCalledWith({ rpePreference: "preferred" });
    expect(screen.getByLabelText("Units: Pounds (lb)")).toBeOnTheScreen();
  });

  it("changes the primary goal for future calculation context", async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      ...settings.profile,
      primaryGoal: "strength",
    });
    const screen = await render(
      <ProfileScreen loadProfile={async () => settings} updateProfile={updateProfile} />,
    );

    expect(await screen.findByLabelText("Primary Goal: Both")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Goal Get Stronger" }));
    expect(await screen.findByLabelText("Primary Goal: Get Stronger")).toBeOnTheScreen();
    expect(updateProfile).toHaveBeenCalledWith({ primaryGoal: "strength" });
  });

  it("changes progression style and exposes only the updated active state", async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      ...settings.profile,
      progressionStyle: "aggressive",
    });
    const screen = await render(
      <ProfileScreen loadProfile={async () => settings} updateProfile={updateProfile} />,
    );

    expect(await screen.findByLabelText("Progression Style: Balanced")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Progression Aggressive" }));
    expect(await screen.findByLabelText("Progression Style: Aggressive")).toBeOnTheScreen();
    expect(updateProfile).toHaveBeenCalledWith({ progressionStyle: "aggressive" });
  });

  it("saves a positive default rest duration", async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      ...settings.profile,
      defaultRestDurationSeconds: 180,
    });
    const screen = await render(
      <ProfileScreen loadProfile={async () => settings} updateProfile={updateProfile} />,
    );

    const input = await screen.findByLabelText("Default rest duration in seconds");
    await fireEvent.changeText(input, "180");
    await fireEvent.press(screen.getByRole("button", { name: "Save Default Rest" }));
    expect(await screen.findByLabelText("Default Rest: 180 seconds")).toBeOnTheScreen();
    expect(updateProfile).toHaveBeenCalledWith({ defaultRestDurationSeconds: 180 });
  });

  it("rejects non-positive default rest durations before persistence", async () => {
    const updateProfile = jest.fn();
    const screen = await render(
      <ProfileScreen loadProfile={async () => settings} updateProfile={updateProfile} />,
    );

    const input = await screen.findByLabelText("Default rest duration in seconds");
    await fireEvent.changeText(input, "0");
    expect(screen.getByText("Enter a positive whole number of seconds.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Save Default Rest" })).toBeDisabled();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("offers Cancel and Try Sync instead of abandoning pending data", async () => {
    const prepareLogout = jest.fn().mockResolvedValue("pending_sync");
    const trySyncAndLogout = jest.fn().mockResolvedValue(false);
    const screen = await render(
      <ProfileScreen
        loadProfile={async () => settings}
        prepareLogout={prepareLogout}
        trySyncAndLogout={trySyncAndLogout}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Logout" }));
    expect(await screen.findByText("Unsynced workout data")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Try Sync" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(trySyncAndLogout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Unsynced workout data")).toBeNull();
  });

  it("keeps the user signed in and reports a sanitized failed sync", async () => {
    const trySyncAndLogout = jest.fn().mockResolvedValue(false);
    const screen = await render(
      <ProfileScreen
        loadProfile={async () => settings}
        prepareLogout={jest.fn().mockResolvedValue("pending_sync")}
        trySyncAndLogout={trySyncAndLogout}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Logout" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Try Sync" }));
    expect(await screen.findByText(
      "Your data is still saved on this device. Sync could not finish, so you were not logged out.",
    )).toBeOnTheScreen();
    expect(trySyncAndLogout).toHaveBeenCalledTimes(1);
  });
});
