// src/features/products/components/FilterBar.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const HEADPHONE_TYPES = ["Over-Ear", "In-Ear", "Wireless Earbuds", "Noise Cancelling"];
const SORT_OPTIONS = [
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Highest Rated", value: "rating-desc" },
  { label: "Newest", value: "newest" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const currentType = searchParams.get("type");
  const currentSort = searchParams.get("sort") || "newest";

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function updateQuery(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setActiveDropdown(null);
  }

  return (
    <div ref={filterRef} className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 mt-8 relative z-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Headphone Type Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border transition ${
                currentType
                  ? "bg-[#003d29] text-white border-[#003d29]"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-transparent"
              }`}
            >
              <span>{currentType || "Headphone Type"}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {activeDropdown === "type" && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 z-30">
                {HEADPHONE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => updateQuery("type", type)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-zinc-50 text-left text-zinc-800"
                  >
                    <span>{type}</span>
                    {currentType === type && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Static Chips / Future expansions */}
          {["Price", "Review", "Color", "Material"].map((tag) => (
            <button
              key={tag}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-full transition"
            >
              {tag} <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          ))}

          {/* Reset Filters */}
          {(currentType || searchParams.get("sort")) && (
            <button
              onClick={() => router.push(pathname)}
              className="text-xs text-rose-600 font-semibold px-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Right Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
            className="flex items-center gap-2 border border-zinc-200 px-4 py-2 rounded-full text-xs font-semibold text-zinc-800 hover:border-zinc-300 bg-white"
          >
            <span>
              Sort by:{" "}
              <span className="font-bold text-[#003d29]">
                {SORT_OPTIONS.find((s) => s.value === currentSort)?.label || "Newest"}
              </span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {activeDropdown === "sort" && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 z-30">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateQuery("sort", option.value)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-zinc-50 text-left text-zinc-800"
                >
                  <span>{option.label}</span>
                  {currentSort === option.value && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}