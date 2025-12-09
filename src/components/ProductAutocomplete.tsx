import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Product } from '@/hooks/useProducts';
import { Search } from 'lucide-react';

type ProductAutocompleteProps = {
  products: Product[];
  value: string;
  onSelect: (product: Product) => void;
  onManualInput: (name: string) => void;
  placeholder?: string;
  className?: string;
};

export const ProductAutocomplete = ({
  products,
  value,
  onSelect,
  onManualInput,
  placeholder = "Digite para buscar produto...",
  className
}: ProductAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter(p => 
    p.active && p.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const handleSelect = (product: Product) => {
    setSearch(product.name);
    onSelect(product);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onManualInput(newValue);
    setIsOpen(true);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && filteredProducts[highlightIndex]) {
          handleSelect(filteredProducts[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay to allow click on list item
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 150);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={search}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8 text-xs pl-7"
        />
      </div>
      
      {isOpen && filteredProducts.length > 0 && (
        <div 
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
        >
          {filteredProducts.map((product, index) => (
            <button
              key={product.id}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-xs hover:bg-accent transition-colors",
                highlightIndex === index && "bg-accent"
              )}
              onClick={() => handleSelect(product)}
            >
              <div className="font-medium text-foreground">{product.name}</div>
              <div className="text-muted-foreground text-[10px]">
                {product.category} • R$ {product.unit_price.toFixed(2)}/{product.unit}
                {product.recommended_dose ? ` • ${product.recommended_dose} ${product.recommended_dose_unit}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};