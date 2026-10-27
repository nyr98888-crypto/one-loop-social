"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import PublishGuideModal from "@/components/connect/PublishGuideModal";
import { usePostStore } from "@/store/usePostStore";
import { useSocialConnectStore } from "@/store/useSocialConnectStore";

function StoreHydration({ children }: { children: ReactNode }) {
  useEffect(() => {
    void usePostStore.persist.rehydrate();
    void useSocialConnectStore.persist.rehydrate();
  }, []);
  return <>{children}</>;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <StoreHydration>
        {children}
        <PublishGuideModal />
      </StoreHydration>
    </SessionProvider>
  );
}
