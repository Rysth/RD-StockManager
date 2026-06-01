import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  value?: string;
  debounceTime?: number;
  className?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Buscar...",
  value = "",
  debounceTime = 500,
  className = "",
}: SearchBarProps) {
  // Estado local para mostrar caracteres inmediatamente mientras el usuario escribe.
  // El prop `value` solo se usa para sincronizar resets externos (ej. "Limpiar filtros").
  const [inputValue, setInputValue] = useState(value);
  const prevExternalValue = useRef(value);

  useEffect(() => {
    // Si el padre resetea el valor (ej. a "") lo reflejamos en el input.
    if (value !== prevExternalValue.current && value !== inputValue) {
      setInputValue(value);
    }
    prevExternalValue.current = value;
  }, [value, inputValue]);

  const debouncedSearch = useDebouncedCallback((term: string) => {
    onSearch(term);
  }, debounceTime);

  const handleChange = (newValue: string) => {
    setInputValue(newValue);       // actualización visual inmediata
    debouncedSearch(newValue);     // llamada al padre debounced
  };

  const clearSearch = () => {
    debouncedSearch.cancel();
    setInputValue("");
    onSearch("");
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        className="pl-8 pr-8"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-0 right-0 h-full px-2 hover:bg-transparent"
          onClick={clearSearch}
          type="button"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
    </div>
  );
}
