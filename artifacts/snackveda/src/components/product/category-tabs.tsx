import { ProductCategory } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  activeCategory: ProductCategory | "all";
  onChange: (category: ProductCategory | "all") => void;
}

export function CategoryTabs({ activeCategory, onChange }: CategoryTabsProps) {
  const categories: { id: ProductCategory | "all"; label: string }[] = [
    { id: "all", label: "All Products" },
    { id: "chips", label: "Healthy Chips" },
    { id: "makhana", label: "Makhana" },
    { id: "superpuffs", label: "Superpuffs" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onChange(category.id)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            activeCategory === category.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
