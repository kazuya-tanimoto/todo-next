import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeSwitcher from "./ThemeSwitcher";

describe("ThemeSwitcher", () => {
  it("renders three theme options", () => {
    render(<ThemeSwitcher theme="brutal" onThemeChange={() => {}} />);

    expect(screen.getByText("Mono")).toBeInTheDocument();
    expect(screen.getByText("Natural")).toBeInTheDocument();
    expect(screen.getByText("Brutal")).toBeInTheDocument();
  });

  it("calls onThemeChange with the selected theme id", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<ThemeSwitcher theme="brutal" onThemeChange={onThemeChange} />);

    await user.click(screen.getByText("Natural"));

    expect(onThemeChange).toHaveBeenCalledWith("natural");
  });
});
