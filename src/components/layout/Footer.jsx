"use client";

import Link from "next/link";
import Image from "next/image";
import { FaInstagram, FaTwitter, FaYoutube, FaLinkedin } from 'react-icons/fa';
// import { Instagram, Twitter, Youtube, Mail, Phone } from "lucide-react";
import { useState } from "react";
import black_logo from "../../../public/optimized/logo-mark-256.webp"
import { BUSINESS, formatAddress, operatedBy } from "@/lib/business";
import { LEGAL_PAGES } from "@/lib/legal-pages";

export function Footer() {
  const [email, setEmail] = useState("");

  function handleSubscribe(e) {
    e.preventDefault();
    console.log("Subscribed:", email);
    setEmail("");
  }

  return (
    <footer className="w-full bg-[#161616] text-[#e0e0e0] text-sm selection:bg-zinc-700 selection:text-white border-t border-zinc-800">
      {/* 1. Main Navigation & Information Grid */}
      <div className="w-full px-4 sm:px-10 lg:px-16 xl:px-20 pt-12 sm:pt-16 pb-10 sm:pb-14">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-14 gap-x-6 gap-y-10 lg:gap-8">
          
          {/* Brand & Manifesto Column (Span 4) */}
          <div className="col-span-2 md:col-span-2 lg:col-span-4 flex flex-col items-start pr-0 lg:pr-8">
            {/* Pop-Art Logo Style */}
            <Link href="/" className=" group mb-4 ">
              <Image src={black_logo} alt="Z Factor Studio" sizes="(min-width: 640px) 128px, 96px" className="w-24 h-24 sm:w-32 sm:h-32"/>
            </Link>

            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed max-w-sm font-light">
              Made for the obsession. Enthusiast collectibles — numbered, made-to-order on Bambu Lab P2S, hand-finished and shipped from{" "}
              <strong className="text-white font-medium">Pune</strong>.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
              
            </div>
          </div>

          {/* Links Column 1: Tribes (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-white tracking-wider">Tribes</h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li><Link href="/tribes/motorcycles" className="hover:text-white transition">The Café · motorcycles</Link></li>
              <li><Link href="/tribes/cars" className="hover:text-white transition">The Garage · cars</Link></li>
              <li><Link href="/tribes/pop-culture" className="hover:text-white transition">The Wall · pop culture</Link></li>
              <li><Link href="/tribes/classics" className="hover:text-white transition">Studio Classics</Link></li>
              <li><Link href="/tribes/bespoke" className="hover:text-white transition">Bespoke commissions</Link></li>
              <li><Link href="/tribes/bundles" className="hover:text-white transition">Gift bundles</Link></li>
            </ul>
          </div>

          {/* Links Column 2: 3D printing (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-white tracking-wider">3D printing</h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li><Link href="/3d-printing/gifts" className="hover:text-white transition">3D-printed gifts</Link></li>
              <li><Link href="/3d-printing/collectibles" className="hover:text-white transition">3D-printed collectibles</Link></li>
              <li><Link href="/3d-printing/home-decor" className="hover:text-white transition">3D-printed home decor</Link></li>
              <li><Link href="/3d-printing/india" className="hover:text-white transition">3D printing in India</Link></li>
            </ul>
          </div>

          {/* Links Column 3: Studio (Span 2) */}
          {/* <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-white tracking-wider">Studio</h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li><Link href="/about" className="hover:text-white transition">About Oruky</Link></li>
              <li><Link href="/tribes" className="hover:text-white transition">The tribes</Link></li>
              <li><Link href="/custom-print" className="hover:text-white transition">Custom print · upload your STL</Link></li>
              <li><Link href="/brands" className="hover:text-white transition">For brands & clubs</Link></li>
              <li><Link href="/journal" className="hover:text-white transition">Journal</Link></li>
              <li><Link href="/studio-live" className="hover:text-white transition">The studio <span className="text-zinc-500">(live)</span></Link></li>
              <li><Link href="/contact-us" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div> */}

          {/* Policies (required for payment gateway approval) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-white tracking-wider">Policies</h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              {LEGAL_PAGES.map((page) => (
                <li key={page.href}>
                  <Link href={page.href} className="hover:text-white transition">{page.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Drop Notifications (Span 2) */}
          <div className="col-span-2 lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-white tracking-wider">Drop notifications</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              One email per drop. Subscribers get the link 12h before everyone else. No noise.
            </p>

            <form onSubmit={handleSubscribe} className="mt-4 flex items-center bg-[#242424] rounded-full p-1 border border-zinc-700/60 focus-within:border-zinc-500">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@desk.cc"
                className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="rounded-full bg-white text-zinc-950 font-semibold text-xs px-4 py-1.5 hover:bg-zinc-200 transition shrink-0"
              >
                Join
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* 2. Middle Regulatory & Corporate Legal Metadata */}
      <div className="w-full border-t border-zinc-800/80 px-6 sm:px-10 lg:px-16 xl:px-20 py-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-[11px] text-zinc-500">
          <div className="space-y-1 max-w-4xl leading-relaxed">
            <p>
              <strong className="text-zinc-300 font-medium">{BUSINESS.brandName}</strong> — operated by {operatedBy()}, {formatAddress()}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-400">
              {BUSINESS.gstRegistered && BUSINESS.gstin && <span><strong>GSTIN:</strong> {BUSINESS.gstin}</span>}
              <a href={`mailto:${BUSINESS.email}`} className="inline-flex items-center gap-1 hover:text-white transition">
                {BUSINESS.email}
              </a>
              <span className="inline-flex items-center gap-1">{BUSINESS.phone}</span>
            </div>
          </div>

          {/* Quick Legal Links */}
          {/* <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-400 shrink-0">
            <Link href="/shipping-policy" className="hover:text-white transition">Shipping</Link>
            <Link href="/cancellation-and-refund-policy" className="hover:text-white transition">Refunds</Link>
            <Link href="/privacy-policy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms-and-conditions" className="hover:text-white transition">Terms</Link>
            <Link href="/contact-us" className="hover:text-white transition">Contact</Link>
          </nav> */}
        </div>
      </div>

      {/* 3. Bottom Minimal Copyright Strip */}
      <div className="w-full border-t border-zinc-800/40 px-6 sm:px-10 lg:px-16 xl:px-20 py-4 text-center text-[11px] text-zinc-500">
        © {new Date().getFullYear()} <strong className="text-zinc-300 font-medium">{BUSINESS.brandName}</strong> · operated by <strong className="text-zinc-300 font-medium">{operatedBy()}</strong>
      </div>
    </footer>
  );
}