const products_list = [
  {
    "_id": "prod_lamp_001",
    "name": "Kasako Mushroom Ambient Lamp",
    "price": "95.00",
    "offer-price": "79.00",
    "image": [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=1000&auto=format&fit=crop&q=80"
    ],
    "highlighted-image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&auto=format&fit=crop&q=80",
    "varients": [
      { "id": "v1", "name": "Color", "value": "Lavender Purple" },
      { "id": "v2", "name": "Color", "value": "Warm Sand" },
      { "id": "v3", "name": "Color", "value": "Sage Green" }
    ],
    "category": "lamp",
    "tags": ["ambient-light", "desk-decor", "3d-printed", "bestseller"],
    "productDetials": {
      "description": "Inspired by organic fungal silhouettes and Japanese umbrella shades, the Kasako Mini Lamp diffuses a warm, flicker-free glow ideal for bedside tables, reading nooks, and study counters.",
      "sizing-and-materials": "Dimensions: 18cm x 18cm x 22cm. Weight: 420g. Crafted with plant-based, biodegradable PLA thermoplastic with a frosted acrylic core diffuser.",
      "craft-and-quality": "Precision additive manufactured on multi-axis FDM systems. Hand-sanded, inspected for structural layer consistency, and fitted with low-heat USB-C powered LED modules.",
      "policy": "1-year warranty against LED electrical defects. Hassle-free 14-day exchange on transit damages."
    }
  },
  {
    "_id": "prod_litho_002",
    "name": "Lumina Curved Memory Frame",
    "price": "55.00",
    "offer-price": "45.00",
    "image": [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80"
    ],
    "highlighted-image": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1000&auto=format&fit=crop&q=80",
    "varients": [
      { "id": "v4", "name": "Base Type", "value": "Natural Teakwood" },
      { "id": "v5", "name": "Base Type", "value": "Matte Charcoal" }
    ],
    "category": "Lithophane",
    "tags": ["personalized", "gift", "lithophane", "warm-glow"],
    "productDetials": {
      "description": "A translucent bas-relief artwork that appears grayscale and subtle in natural light, but bursts into a high-contrast, luminous black-and-white portrait when backlit.",
      "sizing-and-materials": "Frame: 15cm x 10cm (Arc Curvature 120°). Base: Solid polished walnut base with integrated 3000K warm LED illumination strip.",
      "craft-and-quality": "Engineered using ultra-dense 0.08mm micro-layer deposition to capture high-resolution grayscale photographic gradients directly into the polymer surface.",
      "policy": "Custom-printed items cannot be returned unless damaged during shipment or containing fabrication defects."
    }
  },
  {
    "_id": "prod_post_003",
    "name": "Cyberpunk Neon District Relief Poster",
    "price": "60.00",
    "offer-price": "49.00",
    "image": [
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80"
    ],
    "highlighted-image": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80",
    "varients": [
      { "id": "v6", "name": "Size", "value": "A4 (210 x 297 mm)" },
      { "id": "v7", "name": "Size", "value": "A3 (297 x 420 mm)" }
    ],
    "category": "poster",
    "tags": ["wall-art", "sci-fi", "pop-culture", "relief-print"],
    "productDetials": {
      "description": "Multi-dimensional relief wall art featuring layered topographic architectural lines and dual-tone neon reflections depicting a futuristic rainy city corner.",
      "sizing-and-materials": "Thickness: 6mm multi-layer composite. Printed using archival-grade matte polymers resistant to UV discoloration and warping.",
      "craft-and-quality": "Filament swapping technique with varying extrusion heights to produce tactile, tangible depth unachievable with flat paper lithography.",
      "policy": "Standard 30-day return policy. Arrives enclosed in protective rigid corner guards."
    }
  },
  {
    "_id": "prod_key_004",
    "name": "Boxer Engine Piston Articulated Fidget",
    "price": "22.00",
    "offer-price": "18.00",
    "image": [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80"
    ],
    "highlighted-image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80",
    "varients": [
      { "id": "v8", "name": "Finish", "value": "Industrial Gunmetal" },
      { "id": "v9", "name": "Finish", "value": "Raw Carbon Black" }
    ],
    "category": "keychain",
    "tags": ["edc", "automotive", "fidget", "accessories"],
    "productDetials": {
      "description": "Functional mechanical keychain featuring a moving miniature connecting rod and piston head. Engineered for tactile feedback, smooth travel, and pocket durability.",
      "sizing-and-materials": "Length: 6.5cm. Split Ring: Heavy-duty 304 Stainless Steel (25mm diameter). Body: High-strength PETG copolymer.",
      "craft-and-quality": "Print-in-place moving linkage mechanism with zero external pins or glue joints. Tested to endure 10,000+ continuous motion cycles.",
      "policy": "Replacement warranty within 30 days if linkage fractures under regular daily pocket wear."
    }
  },
  {
    "_id": "prod_mini_005",
    "name": "Cyber-Ronin Mech Warrior Statuette",
    "price": "120.00",
    "offer-price": "105.00",
    "image": [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80"
    ],
    "highlighted-image": "https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=80",
    "varients": [
      { "id": "v10", "name": "Scale", "value": "75mm (Collector Scale)" },
      { "id": "v11", "name": "Scale", "value": "120mm (Showcase Display)" }
    ],
    "category": "miniatures",
    "tags": ["collectibles", "tabletop", "figurine", "hand-painted"],
    "productDetials": {
      "description": "Intricately sculpted futuristic samurai miniature adorned with traditional armor plating retrofitted with hydraulic actuators and modular scabbards.",
      "sizing-and-materials": "Height: 75mm (standard). Base diameter: 40mm. High-impact photopolymer resin capable of reproducing sub-millimeter detailing.",
      "craft-and-quality": "SLA/DLP 8K resin cured, cleaned with isopropyl vapor, UV stabilized, and finished in a smooth neutral gray primer ready for acrylic painting or standalone showcase.",
      "policy": "Fragile item. Packaged with custom foam insert; free replacement if broken on arrival."
    }
  },
  {
    "_id": "prod_cust_006",
    "name": "Bespoke Architectural Desk Bust / STL Print",
    "price": "150.00",
    "offer-price": "130.00",
    "image": [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1000&auto=format&fit=crop&q=80"
    ],
    "highlighted-image": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80",
    "varients": [
      { "id": "v12", "name": "Infill Density", "value": "Solid Weight (30%)" },
      { "id": "v13", "name": "Infill Density", "value": "Display Weight (15%)" }
    ],
    "category": "Custom",
    "tags": ["bespoke", "custom-stl", "commission", "one-of-a-kind"],
    "productDetials": {
      "description": "Have your digital sculpt, scan, architectural CAD file, or personal 3D file produced on enterprise-grade hardware with customized layer heights, infills, and color choices.",
      "sizing-and-materials": "Maximum envelope: Up to 256 x 256 x 256 mm. Materials available: Matte PLA, Engineering PETG, or Tough UV Resin.",
      "craft-and-quality": "Includes automated mesh integrity checks, slicing optimization, support removal, and post-processing heat treatment to eliminate layer lines.",
      "policy": "Because this service is custom-fabricated according to client-submitted digital assets, orders cannot be cancelled once slicing and print jobs initiate."
    }
  }
]