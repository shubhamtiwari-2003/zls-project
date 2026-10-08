// A product suggested by the header search (/api/search).
export interface SearchSuggestion {
  id: string;
  name: string;
  href: string;
  category: string | null;
  image: string | null;
  // Lowest variant price ("From ₹…").
  price: number;
  compareAtPrice: number | null;
}
