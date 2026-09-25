"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  Wallet,
  RotateCcw,
} from "lucide-react";
import img1 from "../../../../../../public/batman.jpg";
import img2 from "../../../../../../public/spiderman.jpg";
import img3 from "../../../../../../public/ironman.jpg";
import img4 from "../../../../../../public/cyberpunk.jpg";
import Breadcrumb from "@/components/shared/Breadcrumb";


const images = [
  img1,img2,img3,img4
];

export default function ProductPage() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const price = 2499;
  const originalPrice = 2999;
  const subtotal = price * quantity;

  return (
    <main className="bg-background min-h-screen">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <Breadcrumb/>

        <div className="grid lg:grid-cols-2 gap-8 xl:gap-12">
          {/* LEFT : Gallery */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-surface">
              <Image
                src={images[selectedImage]}
                alt="King 18 Frame"
                fill
                className="object-contain p-4"
                priority
              />
            </div>

            <div className="mt-4 flex gap-3">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-24 w-24 overflow-hidden rounded-xl border transition ${
                    selectedImage === index
                      ? "border-foreground"
                      : "border-border"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT : Details */}
          <div className="flex flex-col">
            <span className="w-fit rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium">
              3D Journey Frame
            </span>

            <h1 className="mt-4 text-4xl font-bold text-foreground">
              Spiderman
            </h1>

            <p className="mt-2 text-xl text-muted">
              — The Number That Became an Emotion.
            </p>

            <p className="mt-5 text-sm font-medium">
              Just dropped — be the first to review
            </p>

            {/* Price */}
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <span className="text-4xl font-black">₹2,499</span>

              <span className="text-xl text-muted line-through">
                ₹2,999
              </span>

              <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-black">
                17% OFF
              </span>
            </div>

            {/* Highlights */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-green-600" />
                <span>Free shipping on this frame</span>
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-green-600" />
                <span>Order now — print starts tomorrow morning</span>
              </div>

              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-green-600" />
                <span>2 Frames = 15% OFF · 3+ Frames = 25% OFF</span>
              </div>
            </div>

            {/* Description */}
            <div className="mt-8">
              <p className="text-muted leading-8">
                Some numbers are worn. Some numbers become legends. King 18
                captures the aura of Indian cricket's most iconic No.18 — the
                intensity, the attitude, the hunger and the moments that made
                millions believe.
              </p>
            </div>

            {/* Specs */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-surface p-4 text-center">
                <p className="text-lg font-bold">120μm</p>
                <p className="text-xs text-muted mt-1">PRINT</p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4 text-center">
                <p className="text-lg font-bold">200g</p>
                <p className="text-xs text-muted mt-1">WEIGHT</p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4 text-center">
                <p className="text-lg font-bold">240×330</p>
                <p className="text-xs text-muted mt-1">SIZE</p>
              </div>
            </div>

            {/* Quantity */}
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold tracking-wide">
                QUANTITY
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-full border border-border">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-surface-secondary rounded-full"
                  >
                    <Minus size={16} />
                  </button>

                  <span className="w-10 text-center font-semibold">
                    {quantity}
                  </span>

                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-surface-secondary rounded-full"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <span className="text-sm text-muted">
                  ₹{subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 flex gap-3">
              <button className="cursor-pointer flex-1 rounded-full border border-border py-4 font-semibold hover:bg-surface-secondary transition">
                View Cart
              </button>

              <button className="flex-[1.2] cursor-pointer rounded-full bg-background border border-border py-4 font-semibold text-foreground hover:opacity-90 transition">
                Checkout
              </button>

              <button className="rounded-full border border-border p-4 hover:bg-surface-secondary">
                <Heart size={20} />
              </button>
            </div>

            {/* Features */}
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Wallet size={18} />
                <span>Cash on Delivery</span>
              </div>

              <div className="flex items-center gap-2">
                <Truck size={18} />
                <span>Free Shipping</span>
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck size={18} />
                <span>Authenticity Included</span>
              </div>

              <div className="flex items-center gap-2">
                <RotateCcw size={18} />
                <span>Lifetime Reprint</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <section className="mt-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">You may also like</h2>

            <Link
              href="/products/posters"
              className="text-sm text-muted hover:text-foreground"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="group">
                <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-surface">
                  <Image
                    src="/products/king18-1.jpg"
                    alt=""
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>

                <h3 className="mt-3 font-semibold">Legacy Frame</h3>
                <p className="text-muted text-sm">Premium 3D Frame</p>
                <p className="mt-1 font-bold">₹2,199</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}