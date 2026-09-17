"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import type { PayPad } from "@/features/paypads/schemas";
import { cn } from "@/lib/utils";

interface PaypadOption {
  label: string;
  value: string;
}

interface SearchablePaypadSelectProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  allowAllPaypads?: boolean;
  disabled?: boolean;
  id?: string;
  onValueChange: (value: string) => void;
  paypads: readonly PayPad[];
  placeholder?: string;
  value: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .trim();
}

export function SearchablePaypadSelect({
  allowAllPaypads = false,
  disabled = false,
  id,
  onValueChange,
  paypads,
  placeholder = "Busca y selecciona un Pay+",
  value,
  ...inputAccessibilityProps
}: SearchablePaypadSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const synchronisedValue = useRef(value);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const options = useMemo<PaypadOption[]>(() => {
    const paypadOptions = paypads.map((paypad) => ({
      label: `${getPaypadDisplayName(paypad)} · ID ${paypad.id}`,
      value: String(paypad.id),
    }));

    return allowAllPaypads ? [{ label: "Todos los Pay+", value: "all" }, ...paypadOptions] : paypadOptions;
  }, [allowAllPaypads, paypads]);

  const selectedOption = options.find((option) => option.value === value);
  const matchingOptions = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (normalizedQuery.length === 0) {
      return options;
    }

    return options.filter((option) => normalize(option.label).includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (value === synchronisedValue.current) {
      return;
    }

    synchronisedValue.current = value;
    setQuery(options.find((option) => option.value === value)?.label ?? "");
  }, [options, value]);

  useEffect(() => {
    function closeWhenPointerLeaves(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", closeWhenPointerLeaves);
    return () => document.removeEventListener("pointerdown", closeWhenPointerLeaves);
  }, []);

  function chooseOption(option: PaypadOption): void {
    synchronisedValue.current = option.value;
    setQuery(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
    onValueChange(option.value);
  }

  function clearSelection(): void {
    synchronisedValue.current = "";
    setQuery("");
    setActiveIndex(-1);
    onValueChange("");
  }

  function changeQuery(nextQuery: string): void {
    if (value !== "") {
      synchronisedValue.current = "";
      onValueChange("");
    }

    setQuery(nextQuery);
    setIsOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.min(current + 1, matchingOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setQuery(selectedOption?.label ?? "");
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter" && isOpen) {
      const selected = matchingOptions[activeIndex] ?? (matchingOptions.length === 1 ? matchingOptions[0] : undefined);

      if (selected) {
        event.preventDefault();
        chooseOption(selected);
      }
    }
  }

  const activeOption = activeIndex >= 0 ? matchingOptions[activeIndex] : undefined;

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          {...inputAccessibilityProps}
          aria-activedescendant={activeOption ? `${listboxId}-${activeOption.value}` : undefined}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          autoComplete="off"
          className="pr-20 pl-9"
          disabled={disabled}
          id={id}
          onChange={(event) => changeQuery(event.target.value)}
          onFocus={() => {
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          value={query}
        />
        {query.length > 0 ? (
          <Button
            aria-label="Limpiar selección de Pay+"
            className="absolute right-9 top-0"
            disabled={disabled}
            onClick={clearSelection}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {isOpen && !disabled ? (
        <div
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lift"
          id={listboxId}
          role="listbox"
        >
          {matchingOptions.length > 0 ? (
            matchingOptions.map((option, index) => (
              <button
                aria-selected={option.value === value}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-popover-foreground transition-colors duration-300 hover:bg-secondary focus-visible:bg-secondary",
                  index === activeIndex ? "bg-secondary" : "",
                )}
                id={`${listboxId}-${option.value}`}
                key={option.value}
                onClick={() => chooseOption(option)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value ? <Check aria-label="Seleccionado" className="size-4 shrink-0 text-primary" /> : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground" role="status">
              No se encontraron equipos Pay+.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
