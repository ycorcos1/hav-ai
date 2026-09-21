import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@/lib/supabase/client", () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import {
  CoachScreen,
  coachSuggestedPrompts,
} from "@/features/coach/screens/CoachScreen";
import type { CoachApi } from "@/features/ai/api";

function coachResponse(answer: string) {
  return {
    answer,
    warnings: [],
    contextUsed: {
      activeWorkout: false,
      recentSessionsUsed: 0,
      subjectiveNotesUsed: { exercisePreference: false, workout: false, setCount: 0 },
    },
    meta: { promptVersion: "coach-v1" },
  };
}

function controlledApi(ask: CoachApi["ask"]): CoachApi {
  return { ask };
}

describe("CoachScreen initial state", () => {
  it("shows the havAI Coach identity, suggested prompts, and message input", async () => {
    const screen = await render(<CoachScreen />);

    expect(screen.getByText("HAVAI COACH")).toBeOnTheScreen();
    expect(screen.getByText("What do you want to know?")).toBeOnTheScreen();
    for (const prompt of coachSuggestedPrompts) {
      expect(screen.getByRole("button", { name: prompt })).toBeOnTheScreen();
    }
    expect(screen.getByLabelText("Ask havAI")).toHaveProp("placeholder", "Ask havAI...");
  });

  it("places a suggested prompt into the editable message field without making a request", async () => {
    const screen = await render(<CoachScreen />);
    const prompt = coachSuggestedPrompts[1];

    await fireEvent.press(screen.getByRole("button", { name: prompt }));

    expect(screen.getByLabelText("Ask havAI")).toHaveProp("value", prompt);
  });

  it("keeps a session-local conversation and sends recent messages for follow-ups", async () => {
    const ask = jest.fn()
      .mockResolvedValueOnce(coachResponse("Keep the same load."))
      .mockResolvedValueOnce(coachResponse("Yes, for one more set."));
    let sequence = 0;
    const screen = await render(
      <CoachScreen
        api={controlledApi(ask)}
        createId={() => `message-${sequence += 1}`}
        now={() => "2026-09-21T12:00:00.000Z"}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText("Ask havAI"), "Should I keep 185?");
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Keep the same load.")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Ask havAI"), "For another set?");
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Yes, for one more set.")).toBeOnTheScreen();
    expect(ask).toHaveBeenLastCalledWith({
      message: "For another set?",
      conversation: {
        messages: [
          { role: "user", content: "Should I keep 185?" },
          { role: "assistant", content: "Keep the same load." },
        ],
      },
    });
  });

  it("shows contextual loading while a response is pending", async () => {
    let resolveAnswer: ((value: Awaited<ReturnType<CoachApi["ask"]>>) => void) | undefined;
    const ask = jest.fn(() => new Promise<Awaited<ReturnType<CoachApi["ask"]>>>((resolve) => {
      resolveAnswer = resolve;
    }));
    const screen = await render(<CoachScreen api={controlledApi(ask)} />);

    await fireEvent.changeText(screen.getByLabelText("Ask havAI"), "Review this set");
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByLabelText("Coach response loading")).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ busy: true }),
    );
    expect(screen.getByText("Reviewing your training context...")).toBeOnTheScreen();
    resolveAnswer?.(coachResponse("Stay at this weight."));
    expect(await screen.findByText("Stay at this weight.")).toBeOnTheScreen();
  });

  it("keeps the failed user message and retries without duplicating it", async () => {
    const ask = jest.fn()
      .mockRejectedValueOnce(new Error("provider details"))
      .mockResolvedValueOnce(coachResponse("Try the same load again."));
    const screen = await render(<CoachScreen api={controlledApi(ask)} />);

    await fireEvent.changeText(screen.getByLabelText("Ask havAI"), "What next?");
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Coach is unavailable right now.")).toBeOnTheScreen();
    expect(screen.getAllByText("What next?")).toHaveLength(1);

    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Try the same load again.")).toBeOnTheScreen();
    expect(screen.getAllByText("What next?")).toHaveLength(1);
    expect(ask).toHaveBeenCalledTimes(2);
  });
});
