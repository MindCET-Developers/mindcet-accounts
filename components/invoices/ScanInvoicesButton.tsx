"use client";

import { RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function ScanInvoicesButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "סורק..." : "סריקת Gmail"}
    </Button>
  );
}
