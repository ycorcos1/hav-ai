import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { RestTimerPanel, RestTimerStore } from "@/features/workouts/components/RestTimerProvider";

describe("rest timer controls", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(0); });
  afterEach(async () => { await cleanup(); jest.useRealTimers(); });
  it("survives rerenders, pauses and resumes, and displays completion once", async () => {
    const store = new RestTimerStore();
    store.dispatch({ type: "start", setId: "a", durationSeconds: 60 });
    const rendered = await render(<RestTimerPanel store={store} />);
    expect(rendered.getByText("Rest 1:00")).toBeTruthy();
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    await rendered.rerender(<RestTimerPanel store={store} />);
    expect(rendered.getByText("Rest 0:50")).toBeTruthy();
    await fireEvent.press(rendered.getByText("Pause"));
    await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
    expect(rendered.getByText("Rest 0:50")).toBeTruthy();
    await fireEvent.press(rendered.getByText("+30 seconds"));
    expect(rendered.getByText("Rest 1:20")).toBeTruthy();
    await fireEvent.press(rendered.getByText("Reset"));
    expect(rendered.getByText("Rest 1:00")).toBeTruthy();
    await fireEvent.press(rendered.getByText("Resume"));
    await act(async () => { await jest.advanceTimersByTimeAsync(61_000); });
    expect(rendered.getAllByText("Rest complete")).toHaveLength(1);
    await fireEvent.press(rendered.getByText("Dismiss rest timer"));
    expect(rendered.queryByLabelText("Rest timer")).toBeNull();
  });
});
