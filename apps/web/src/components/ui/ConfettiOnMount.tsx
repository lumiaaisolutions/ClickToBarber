"use client";

import { useState, useEffect } from "react";
import { Confetti } from "./Confetti";

/**
 * Wrapper que dispara confetti automáticamente al montar el componente
 * (útil en páginas de éxito SSR).
 */
export function ConfettiOnMount() {
  const [trigger, setTrigger] = useState(false);
  useEffect(() => { setTrigger(true); }, []);
  return <Confetti trigger={trigger} />;
}
