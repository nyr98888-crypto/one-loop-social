"use client";

import LivePreview from "./LivePreview";

/** @deprecated Prefer LivePreview platform="facebook" — kept for import compatibility. */
export default function FacebookPreview() {
  return <LivePreview platform="facebook" />;
}
