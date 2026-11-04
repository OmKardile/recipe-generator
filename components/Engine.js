"use client";

import { useEffect } from "react";
import { boot } from "@/engine";
import { setupMotion } from "@/engine/setup";

/**
 * Engine mount. Rendered as the last child of <body> (React runs child
 * effects first, so component onPage registrations land before boot).
 */
export default function Engine() {
  useEffect(() => {
    boot(setupMotion);
  }, []);
  return null;
}
