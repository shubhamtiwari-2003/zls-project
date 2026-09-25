"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useResolvedTheme() {
  const { resolvedTheme, ...rest } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    mounted,
    resolvedTheme,
    ...rest,
  };
}