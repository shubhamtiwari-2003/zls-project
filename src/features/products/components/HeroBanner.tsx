import Image from "next/image";
import Link from "next/link";

export function HeroBanner() {
  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 mt-6">
      <div className="relative overflow-hidden rounded-3xl bg-[#fcf0e4] flex items-center justify-between min-h-[420px] px-8 sm:px-16 lg:px-24">
        <div className="max-w-xl z-10 py-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#003d29] tracking-tight leading-tight">
            Grab Upto 50% Off On Selected Headphone
          </h1>
          <div className="mt-8">
            <Link
              href="/products?discount=50"
              className="inline-block bg-[#003d29] hover:bg-[#002b1d] text-white text-base font-medium px-9 py-3.5 rounded-full transition duration-150"
            >
              Buy Now
            </Link>
          </div>
        </div>

        {/* Half split image container for wide screen balance */}
        <div className="absolute right-0 bottom-0 top-0 w-1/2 hidden md:block">
          <Image
            src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80"
            alt="Hero Headphones"
            fill
            priority
            className="object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
}