'use client';

interface CategoryFilterProps {
  categories: Array<{ name: string; suggested?: boolean }>;
  selectedCategory: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="card">
      <p className="text-sm text-vibe-300 mb-3">Filter by category</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.name}
            onClick={() => onSelect(category.name)}
            className={`btn ${selectedCategory === category.name ? 'btn-primary' : 'btn-secondary'} text-sm`}
          >
            {category.name}{category.suggested ? ' ✨' : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
