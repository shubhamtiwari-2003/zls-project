// src/features/cart/components/CartDrawer.tsx
"use client";

import { X, Trash2, Plus, Minus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  if (!isOpen) return null;

  // Placeholder cart items for UI styling
  const items = [
    {
      id: "1",
      title: "Heavyweight Cotton T-Shirt",
      variant: "Onyx Black / Large",
      price: 45,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80",
    },
  ];

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">Your Cart ({items.length})</h2>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-zinc-500">Your cart is currently empty.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-4 py-4">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-zinc-900">{item.title}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{item.variant}</p>
                        </div>
                        <p className="text-sm font-semibold text-zinc-900">${item.price}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-zinc-200 rounded-md">
                          <button className="p-1 hover:bg-zinc-50 text-zinc-600">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2 text-xs font-medium text-zinc-900">{item.quantity}</span>
                          <button className="p-1 hover:bg-zinc-50 text-zinc-600">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button className="text-zinc-400 hover:text-rose-600 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer / Summary */}
          <div className="space-y-2">
            <Link
              href="/cart"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-medium hover:bg-surface-secondary"
            >
              View Cart
            </Link>

            <Link
              href="/checkout"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-full bg-[#058e60] py-3 text-sm font-medium text-white hover:bg-[#002B1D]"
            >
              Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}