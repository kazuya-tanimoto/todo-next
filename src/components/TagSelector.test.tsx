import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import TagSelector from "./TagSelector";
import { Tag } from "@/types";

const mockTags: Tag[] = [
  {
    id: "tag-1",
    list_id: "list-1",
    name: "Groceries",
    color: "green",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tag-2",
    list_id: "list-1",
    name: "Urgent",
    color: "red",
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("TagSelector", () => {
  it("renders a pill for each tag", () => {
    render(
      <TagSelector tags={mockTags} selectedTagIds={[]} onToggle={vi.fn()} />
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("calls onToggle when a tag is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TagSelector tags={mockTags} selectedTagIds={[]} onToggle={onToggle} />
    );

    await user.click(screen.getByText("Groceries"));
    expect(onToggle).toHaveBeenCalledWith("tag-1");
  });

  it("shows aria-pressed for selected tags", () => {
    render(
      <TagSelector
        tags={mockTags}
        selectedTagIds={["tag-1"]}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText("Groceries")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("Urgent")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("renders nothing when tags is empty", () => {
    const { container } = render(
      <TagSelector tags={[]} selectedTagIds={[]} onToggle={vi.fn()} />
    );

    expect(container.innerHTML).toBe("");
  });
});
