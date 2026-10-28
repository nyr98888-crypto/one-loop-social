import { create } from "zustand";

export type AgentRole = "agent" | "user" | "system";

export interface AgentMessage {
  id: string;
  role: AgentRole;
  text: string;
  at: number;
}

export const AGENT_OPENING_MESSAGE =
  "הנה מה שהכנתי לך לפי מה שביקשת! 🔥 מה דעתך על התוצאה? רוצה שנחדד משהו בטקסט, נשנה את הזווית של התמונה, או שזה מושלם לשיגור?";

export const AGENT_AMBIGUITY_MESSAGE =
  "סליחה, לא הצלחתי לקלוט את החלק האחרון של ההודעה. תוכל לחזור על זה רגע?";

interface AgentState {
  open: boolean;
  refining: boolean;
  messages: AgentMessage[];
  draft: string;
  lastPostId: string | null;
  openAfterGenerate: (postId?: string) => void;
  close: () => void;
  setDraft: (value: string) => void;
  pushMessage: (role: AgentRole, text: string) => void;
  setRefining: (value: boolean) => void;
  reset: () => void;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAgentStore = create<AgentState>((set) => ({
  open: false,
  refining: false,
  messages: [],
  draft: "",
  lastPostId: null,
  openAfterGenerate: (postId) =>
    set({
      open: true,
      lastPostId: postId ?? `post_${Date.now()}`,
      draft: "",
      refining: false,
      messages: [
        {
          id: uid(),
          role: "agent",
          text: AGENT_OPENING_MESSAGE,
          at: Date.now(),
        },
      ],
    }),
  close: () => set({ open: false }),
  setDraft: (draft) => set({ draft }),
  pushMessage: (role, text) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: uid(), role, text: text.trim(), at: Date.now() },
      ],
    })),
  setRefining: (refining) => set({ refining }),
  reset: () =>
    set({
      open: false,
      refining: false,
      messages: [],
      draft: "",
      lastPostId: null,
    }),
}));
