"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";

// The panel (and its dialog library) loads when the menu is about to be
// used: touching, hovering or focusing the button, or opening it.
const loadPanel = () => import("./MobileMenuPanel");
const MobileMenuPanel = dynamic(() => loadPanel().then((module) => module.MobileMenuPanel), { ssr: false });

interface MobileMenuProps {
  categories: { name: string; slug: string }[];
}

/** ☰ button for phones and tablets; opens MobileMenuPanel. */
export function MobileMenu({ categories }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);

  const prepare = () => {
    void loadPanel();
    setWanted(true);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setWanted(true);
          setOpen(true);
        }}
        onPointerEnter={prepare}
        onFocus={prepare}
        onTouchStart={prepare}
        className="-ml-1 rounded-lg p-1 text-foreground hover:text-brand-bright lg:hidden"
      >
        <Menu />
      </button>

      {wanted && <MobileMenuPanel categories={categories} open={open} onOpenChange={setOpen} />}
    </>
  );
}
