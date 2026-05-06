import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SortSelector from "./SortSelector";

describe("SortSelector", () => {
  it("renders all sort options", () => {
    render(<SortSelector sortMode="manual" onChange={() => {}} />);
    const select = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");
    expect(select).toHaveValue("manual");
    expect(options).toHaveLength(4);
    expect(options.map((o) => o.textContent)).toEqual(["手動", "作成日", "名前", "完了状態"]);
  });

  it("calls onChange when sort mode is changed", async () => {
    const onChange = vi.fn();
    render(<SortSelector sortMode="manual" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "name");
    expect(onChange).toHaveBeenCalledWith("name");
  });

  it("reflects the current sort mode", () => {
    render(<SortSelector sortMode="completed" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("completed");
  });
});
