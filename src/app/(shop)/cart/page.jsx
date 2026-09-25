"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";

const cartItems = [
  {
    id: "1",
    title: "Batman Knight Poster",
    variant: "Glass Frame · A3",
    price: 649,
    quantity: 2,
    image: "/images/posters/batman.jpg",
  },
  {
    id: "2",
    title: "Spider-Man Neon Poster",
    variant: "Without Frame · A3",
    price: 559,
    quantity: 1,
    image: "/images/posters/spiderman.jpg",
  },
];

export default function CartPage() {
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted mb-8">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Cart</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="w-7 h-7" />
          <h1 className="text-3xl md:text-4xl font-bold">Shopping Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="w-16 h-16 text-zinc-300" />
            <h2 className="mt-6 text-2xl font-semibold">
              Your cart is empty
            </h2>
            <p className="mt-2 text-muted">
              Looks like you haven't added anything yet.
            </p>

            <Link
              href="/products"
              className="mt-6 rounded-full bg-foreground text-background px-6 py-3 font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            {/* LEFT */}
            <div className="rounded-3xl border border-border bg-surface">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-semibold">
                  Cart Items ({cartItems.length})
                </h2>
              </div>

              <div className="divide-y divide-border">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 sm:p-6"
                  >
                    <div className="relative h-28 w-24 sm:h-32 sm:w-28 overflow-hidden rounded-xl bg-zinc-100">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted mt-1">
                          {item.variant}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                        {/* Quantity */}
                        <div className="flex items-center rounded-full border border-border">
                          <button className="p-2 hover:bg-surface-secondary">
                            <Minus className="w-4 h-4" />
                          </button>

                          <span className="w-10 text-center font-medium">
                            {item.quantity}
                          </span>

                          <button className="p-2 hover:bg-surface-secondary">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg">
                            ₹{item.price * item.quantity}
                          </span>

                          <button className="text-muted hover:text-red-500">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-border">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-sm font-medium hover:text-accent transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Continue Shopping
                </Link>
              </div>
            </div>

            {/* RIGHT SUMMARY */}
            <aside className="h-fit rounded-3xl border border-border bg-surface p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Shipping</span>
                  <span className="text-green-600">FREE</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Taxes</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="border-t border-border pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>

              <button className="mt-6 w-full rounded-full bg-[#003D29] py-3 text-white font-semibold hover:bg-[#002B1D] transition">
                Proceed to Checkout
              </button>

              <p className="mt-4 text-xs text-center text-muted">
                Secure payments powered by Razorpay
              </p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}