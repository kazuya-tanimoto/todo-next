import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import TagFilter from "./TagFilter";
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

const defaultProps = {
  tags: mockTags,
  selectedTagIds: new Set<string>(),
  onToggle: vi.fn(),
  onCreateTag: vi.fn().mockResolvedValue(undefined),
  onUpdateTag: vi.fn().mockResolvedValue(undefined),
  onDeleteTag: vi.fn().mockResolvedValue(undefined),
};

describe("TagFilter", () => {
  it("renders tag pills for each tag", () => {
    render(<TagFilter {...defaultProps} />);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("calls onToggle when a tag pill is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TagFilter {...defaultProps} onToggle={onToggle} />);

    await user.click(screen.getByText("Groceries"));
    expect(onToggle).toHaveBeenCalledWith("tag-1");
  });

  it("shows aria-pressed for selected tags", () => {
    render(
      <TagFilter {...defaultProps} selectedTagIds={new Set(["tag-1"])} />
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

  it("shows create form when + Tag button is clicked", async () => {
    const user = userEvent.setup();
    render(<TagFilter {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Add tag" }));

    expect(screen.getByPlaceholderText("Tag name")).toBeInTheDocument();
  });

  it("calls onCreateTag when create form is submitted", async () => {
    const user = userEvent.setup();
    const onCreateTag = vi.fn().mockResolvedValue(undefined);
    render(<TagFilter {...defaultProps} onCreateTag={onCreateTag} />);

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.type(screen.getByPlaceholderText("Tag name"), "New Tag");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onCreateTag).toHaveBeenCalledWith("New Tag", "blue");
  });

  it("shows edit and delete buttons when Edit mode is toggled", async () => {
    const user = userEvent.setup();
    render(<TagFilter {...defaultProps} />);

    // Click the Edit mode toggle button
    await user.click(screen.getByRole("button", { name: /Edit/i }));

    // Now the tags should be rendered as complex elements with title tooltips
    expect(screen.getAllByTitle("Edit tag")).toHaveLength(2);
    expect(screen.getAllByTitle("Delete tag")).toHaveLength(2);
  });

  it("calls onDeleteTag when Delete is clicked in edit mode", async () => {
    const user = userEvent.setup();
    const onDeleteTag = vi.fn().mockResolvedValue(undefined);
    render(<TagFilter {...defaultProps} onDeleteTag={onDeleteTag} />);

    await user.click(screen.getByRole("button", { name: /Edit/i }));

    // There are multiple delete buttons (one for each tag). Let's click the first one.
    const deleteButtons = screen.getAllByTitle("Delete tag");
    await user.click(deleteButtons[0]);

    expect(onDeleteTag).toHaveBeenCalledWith("tag-1");
  });

  it("shows edit form when Edit tag button is clicked in edit mode", async () => {
    const user = userEvent.setup();
    render(<TagFilter {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Edit/i }));

    // Click the edit button for the first tag
    const editButtons = screen.getAllByTitle("Edit tag");
    await user.click(editButtons[0]);

    // Edit form should show with pre-filled value
    const input = screen.getByDisplayValue("Groceries");
    expect(input).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
