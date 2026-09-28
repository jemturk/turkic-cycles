import { render, fireEvent } from "@testing-library/react-native";
import { DateOfBirthField } from "./DateOfBirthField";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

async function typeDate(
  getByPlaceholderText: (text: string) => any,
  { day, month, year }: { day?: string; month?: string; year?: string }
) {
  if (day !== undefined) await fireEvent.changeText(getByPlaceholderText("common.dayPlaceholder"), day);
  if (month !== undefined) await fireEvent.changeText(getByPlaceholderText("common.monthPlaceholder"), month);
  if (year !== undefined) await fireEvent.changeText(getByPlaceholderText("common.yearPlaceholder"), year);
}

describe("DateOfBirthField", () => {
  it("does not emit until day, month, and a 4-digit year are all present", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(<DateOfBirthField onChange={onChange} />);

    await typeDate(getByPlaceholderText, { day: "5" });
    expect(onChange).not.toHaveBeenCalled();
    await typeDate(getByPlaceholderText, { month: "7" });
    expect(onChange).not.toHaveBeenCalled();
    await typeDate(getByPlaceholderText, { year: "199" });
    expect(onChange).not.toHaveBeenCalled();

    await typeDate(getByPlaceholderText, { year: "1996" });
    expect(onChange).toHaveBeenCalledWith("1996-07-05");
  });

  it("zero-pads single-digit day and month", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(<DateOfBirthField onChange={onChange} />);

    await typeDate(getByPlaceholderText, { day: "5", month: "3", year: "2000" });
    expect(onChange).toHaveBeenLastCalledWith("2000-03-05");
  });

  it("does not emit for a month outside 1-12", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(<DateOfBirthField onChange={onChange} />);

    await typeDate(getByPlaceholderText, { day: "5", month: "13", year: "2000" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not emit for a day outside 1-31", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(<DateOfBirthField onChange={onChange} />);

    await typeDate(getByPlaceholderText, { day: "32", month: "1", year: "2000" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("re-emits when a complete date is edited further", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(<DateOfBirthField onChange={onChange} />);

    await typeDate(getByPlaceholderText, { day: "5", month: "3", year: "2000" });
    expect(onChange).toHaveBeenLastCalledWith("2000-03-05");

    await typeDate(getByPlaceholderText, { day: "6" });
    expect(onChange).toHaveBeenLastCalledWith("2000-03-06");
  });
});
