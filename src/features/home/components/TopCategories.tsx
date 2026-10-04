// src/features/home/components/TopCategories.tsx
import Image from "next/image";
import Link from "next/link";
import keychain from "../../../../public/Keychains.avif";
import poster from "../../../../public/poster.png";
import Clicker from "../../../../public/Clickers.webp";
import Lamp from "../../../../public/lamp-prd1.avif";
// import keychain from "../../../../public/Keychains.avif";



interface CategoryTile {
  id: string;
  title: string;
  slug: string;
  bgColor: string;
  imageUrl: string;
}

const TOP_CATEGORIES: CategoryTile[] = [
  {
    id: "1",
    title: "Lamps",
    slug: "lamps",
    bgColor: "bg-[#6d9e8b]", // Sage Green
    imageUrl: Lamp.src,
  },
  {
    id: "2",
    title: "Custom",
    slug: "custom",
    bgColor: "bg-[#f5c678]", // Soft Warm Yellow
    imageUrl: Clicker.src,
  },
  {
    id: "3",
    title: "Lithophane",
    slug: "lithophane",
    bgColor: "bg-[#872323]", // Deep Crimson Red
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "4",
    title: "Keychains",
    slug: "keychains",
    bgColor: "bg-[#18a865]", // Mint Emerald
    imageUrl: keychain.src,
  },
  {
    id: "5",
    title: "3D Frames",
    slug: "3d-frames",
    bgColor: "bg-[#f2b3b0]", // Warm Rose/Blush
    imageUrl: poster.src,
  },
  {
    id: "6",
    title: "Calendars",
    slug: "calendars",
    bgColor: "bg-[#efa04c]", // Amber Mustard
    imageUrl: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=500&auto=format&fit=crop&q=80",
  },
];

export function TopCategories() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-10 lg:px-16 xl:px-20 py-10 sm:py-16">
      <h2 className="text-2xl sm:text-3xl font-sans text-foreground tracking-tight mb-8">
        Find <span className="text-amber-500 ">Products</span> By Categories
      </h2>

      {/* Grid of rounded colored category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {TOP_CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/products/${cat.slug}`}
            className={`group relative h-64 bg-black items-center flex flex-col transition-transform hover:-translate-y-1 hover:shadow-lg`}
          >
            <Image
              src={cat.imageUrl}
              alt={cat.title}
              fill
              sizes="(max-width: 768px) 50vw, 16vw"
              className="object-cover aspect-square group-hover:opacity-45 transition duration-300"
            />
            <div className="m-auto opacity-0 group-hover:opacity-100">
              <h3 className="text-4xl font-bold text-white uppercase tracking-wide drop-shadow-xs">
                {cat.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}