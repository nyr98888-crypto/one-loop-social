import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OfficialChannel = "facebook" | "instagram" | "googleBusiness";

export type ManualGuidePlatform =
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "google"
  | "easy"
  | "linkedin";

export interface ChannelConnection {
  connected: boolean;
  /** Display name stub after simulated / real OAuth */
  displayName: string | null;
  connectedAt: string | null;
  /** true when connection was simulated (no Meta credentials) */
  stub: boolean;
}

interface SocialConnectState {
  facebook: ChannelConnection;
  instagram: ChannelConnection;
  googleBusiness: ChannelConnection;
  /** Studio publish-guide modal */
  guideOpen: boolean;
  guidePlatform: ManualGuidePlatform;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  connectChannel: (
    channel: OfficialChannel,
    opts?: { displayName?: string; stub?: boolean },
  ) => void;
  disconnectChannel: (channel: OfficialChannel) => void;
  toggleChannel: (channel: OfficialChannel) => void;
  openGuide: (platform?: ManualGuidePlatform) => void;
  closeGuide: () => void;
  isAnyOfficialConnected: () => boolean;
  isMetaConnected: () => boolean;
}

const disconnected: ChannelConnection = {
  connected: false,
  displayName: null,
  connectedAt: null,
  stub: false,
};

const CHANNEL_LABELS: Record<OfficialChannel, string> = {
  facebook: "עמוד פייסבוק",
  instagram: "Instagram Business",
  googleBusiness: "Google Business",
};

export const useSocialConnectStore = create<SocialConnectState>()(
  persist(
    (set, get) => ({
      facebook: { ...disconnected },
      instagram: { ...disconnected },
      googleBusiness: { ...disconnected },
      guideOpen: false,
      guidePlatform: "instagram",
      _hasHydrated: false,
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
      connectChannel: (channel, opts) =>
        set({
          [channel]: {
            connected: true,
            displayName: opts?.displayName ?? CHANNEL_LABELS[channel],
            connectedAt: new Date().toISOString(),
            stub: opts?.stub ?? true,
          },
        }),
      disconnectChannel: (channel) =>
        set({
          [channel]: { ...disconnected },
        }),
      toggleChannel: (channel) => {
        const current = get()[channel];
        if (current.connected) {
          get().disconnectChannel(channel);
        } else {
          get().connectChannel(channel, { stub: true });
        }
      },
      openGuide: (platform = "instagram") =>
        set({ guideOpen: true, guidePlatform: platform }),
      closeGuide: () => set({ guideOpen: false }),
      isAnyOfficialConnected: () => {
        const s = get();
        return (
          s.facebook.connected ||
          s.instagram.connected ||
          s.googleBusiness.connected
        );
      },
      isMetaConnected: () => {
        const s = get();
        return s.facebook.connected || s.instagram.connected;
      },
    }),
    {
      name: "one-loop-social-connect",
      skipHydration: true,
      partialize: (state) => ({
        facebook: state.facebook,
        instagram: state.instagram,
        googleBusiness: state.googleBusiness,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function selectIsOfficialConnectedForPlatform(
  platform: string,
): boolean {
  const s = useSocialConnectStore.getState();
  if (platform === "facebook") return s.facebook.connected;
  if (platform === "instagram") return s.instagram.connected;
  if (platform === "google") return s.googleBusiness.connected;
  return false;
}
