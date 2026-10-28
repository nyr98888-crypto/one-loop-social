"use client";

import WhatsAppPreview from "./WhatsAppPreview";

/** @deprecated Prefer WhatsAppPreview — kept for import compatibility. */
export default function WhatsAppLeadChat({
  className,
}: {
  className?: string;
}) {
  return <WhatsAppPreview className={className} />;
}
