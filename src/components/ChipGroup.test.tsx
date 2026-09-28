import { render, fireEvent } from "@testing-library/react-native";
import { ChipGroup } from "./ChipGroup";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

describe("ChipGroup", () => {
  it("adds an option when toggled on, and removes it when toggled off", async () => {
    const onChange = jest.fn();
    const { getByText, rerender } = await render(
      <ChipGroup label="Interests" options={["Travel", "Music"]} value={[]} onChange={onChange} />
    );

    await fireEvent.press(getByText("Travel"));
    expect(onChange).toHaveBeenLastCalledWith(["Travel"]);

    await rerender(<ChipGroup label="Interests" options={["Travel", "Music"]} value={["Travel"]} onChange={onChange} />);
    await fireEvent.press(getByText("Travel"));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("refuses to add another option once at max, but still allows deselecting", async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <ChipGroup label="Interests" options={["Travel", "Music", "Sport"]} value={["Travel", "Music"]} onChange={onChange} max={2} />
    );

    await fireEvent.press(getByText("Sport"));
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.press(getByText("Travel"));
    expect(onChange).toHaveBeenLastCalledWith(["Music"]);
  });

  it("selecting the 'other' chip adds its sentinel value and reveals the text field", async () => {
    const onChange = jest.fn();
    const { getByText, queryByPlaceholderText } = await render(
      <ChipGroup
        label="Occupation"
        options={["Engineer"]}
        value={[]}
        onChange={onChange}
        otherOption={{ value: "other", placeholder: "Type your own" }}
      />
    );

    expect(queryByPlaceholderText("Type your own")).toBeNull();
    await fireEvent.press(getByText("constants.other"));
    expect(onChange).toHaveBeenLastCalledWith(["other"]);
  });

  it("typing custom text replaces the sentinel with the typed value", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText, rerender } = await render(
      <ChipGroup
        label="Occupation"
        options={["Engineer"]}
        value={["other"]}
        onChange={onChange}
        otherOption={{ value: "other", placeholder: "Type your own" }}
      />
    );

    await fireEvent.changeText(getByPlaceholderText("Type your own"), "Artist");
    expect(onChange).toHaveBeenLastCalledWith(["Artist"]);

    await rerender(
      <ChipGroup
        label="Occupation"
        options={["Engineer"]}
        value={["Artist"]}
        onChange={onChange}
        otherOption={{ value: "other", placeholder: "Type your own" }}
      />
    );
    await fireEvent.changeText(getByPlaceholderText("Type your own"), "");
    expect(onChange).toHaveBeenLastCalledWith(["other"]);
  });

  it("deselecting 'other' removes both the sentinel and any typed custom value", async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <ChipGroup
        label="Occupation"
        options={["Engineer"]}
        value={["Artist"]}
        onChange={onChange}
        otherOption={{ value: "other", placeholder: "Type your own" }}
      />
    );

    await fireEvent.press(getByText("constants.other"));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
