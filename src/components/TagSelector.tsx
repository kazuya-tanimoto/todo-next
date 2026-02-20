import { Tag } from "@/types";
import { TAG_COLORS, TagColorKey } from "@/lib/tagColors";

interface Props {
  tags: Tag[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
}

export default function TagSelector({ tags, selectedTagIds, onToggle }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className="px-2 py-0.5 text-xs rounded-full border transition-colors"
            style={
              isSelected
                ? {
                    backgroundColor: TAG_COLORS[tag.color as TagColorKey],
                    color: "#fff",
                    borderColor: TAG_COLORS[tag.color as TagColorKey],
                  }
                : {
                    backgroundColor: "transparent",
                    color: TAG_COLORS[tag.color as TagColorKey],
                    borderColor: TAG_COLORS[tag.color as TagColorKey],
                  }
            }
            aria-pressed={isSelected}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
