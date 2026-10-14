import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { commerceKeys } from "./commerce";
import {
  assistantReducer,
  confirmAssistantProposal,
  getAssistantConfig,
  initialAssistantState,
  resetAssistantConversation,
  sendAssistantFeedback,
  startAssistantConversation,
  streamAssistantMessage,
} from "./assistant";
import type { AssistantConversation, AssistantEvent, AssistantProposal } from "../types/assistant";

export interface UseAssistantOptions {
  /** A guest asked for a customer-only action (cart/orders/checkout) — open your sign-in UI. */
  onLoginRequired?: (message: string) => void;
  /** Called after the shopper confirmed a checkout card. Redirect to `payment.redirect_url` when present. */
  onOrderPlaced?: (order: Awaited<ReturnType<typeof confirmAssistantProposal>>) => void;
}

/**
 * Headless storefront AI assistant: opens/resumes the thread lazily (call
 * `open()` when the widget opens), streams replies, keeps the cart query fresh
 * when the assistant edits it, and re-attaches the guest thread after login.
 * Themes own all of the UI.
 */
export function useAssistant(options: UseAssistantOptions = {}) {
  const config = getAssistantConfig();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(assistantReducer, initialAssistantState);
  const [conversation, setConversation] = useState<AssistantConversation | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const optsRef = useRef(options);
  optsRef.current = options;

  const open = useCallback(async () => {
    if (!config || opening) return;
    setOpening(true);
    setError(null);
    try {
      const thread = await startAssistantConversation(isAuthenticated);
      setConversation(thread.conversation);
      dispatch({ type: "load", messages: thread.messages });
    } catch (e: any) {
      const res = e?.response;
      if (res?.status === 401) optsRef.current.onLoginRequired?.(res.data?.message ?? "سجّل دخولك أولاً");
      setError(res?.data?.message ?? "المساعد غير متاح حالياً.");
    } finally {
      setOpening(false);
    }
  }, [config, isAuthenticated, opening]);

  // Logging in (or out) mid-conversation: re-open so the server adopts the guest thread.
  const authRef = useRef(isAuthenticated);
  useEffect(() => {
    if (authRef.current !== isAuthenticated && conversation) open();
    authRef.current = isAuthenticated;
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEvent = useCallback(
    (event: AssistantEvent) => {
      dispatch({ type: "event", event });
      if (event.event === "cart_updated") queryClient.invalidateQueries({ queryKey: commerceKeys.cart });
      if (event.event === "login_required") optsRef.current.onLoginRequired?.(event.data.message);
    },
    [queryClient],
  );

  const send = useCallback(
    async (text: string) => {
      const message = text.trim().slice(0, config?.max_message_length ?? 1000);
      if (!message || !conversation || state.busy) return;

      dispatch({ type: "send", text: message });
      abortRef.current = new AbortController();
      try {
        await streamAssistantMessage(conversation.id, message, handleEvent, abortRef.current.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") dispatch({ type: "fail", message: "انقطع الاتصال. حاول مرة أخرى." });
      }
    },
    [config, conversation, state.busy, handleEvent],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "fail", message: "أوقفت الرد." });
  }, []);

  const reset = useCallback(async () => {
    if (!conversation) return;
    abortRef.current?.abort();
    await resetAssistantConversation(conversation.id).catch(() => undefined);
    setConversation(null);
    dispatch({ type: "load", messages: [] });
    await open();
  }, [conversation, open]);

  const feedback = useCallback(async (messageId: number, rating: "up" | "down") => {
    dispatch({ type: "feedback", id: messageId, rating });
    await sendAssistantFeedback(messageId, rating).catch(() => undefined);
  }, []);

  const confirm = useCallback(
    async (proposal: AssistantProposal) => {
      const order = await confirmAssistantProposal(proposal.token);
      dispatch({ type: "proposal_done", token: proposal.token });
      queryClient.invalidateQueries({ queryKey: commerceKeys.cart });
      queryClient.invalidateQueries({ queryKey: commerceKeys.orders });
      optsRef.current.onOrderPlaced?.(order);
      return order;
    },
    [queryClient],
  );

  return {
    /** Null when the store doesn't run the assistant — render nothing. */
    config,
    messages: state.messages,
    /** Live status label while a turn runs ("البحث في المنتجات…"), else "". */
    status: state.status,
    busy: state.busy,
    opening,
    error,
    ready: !!conversation,
    open,
    send,
    stop,
    reset,
    feedback,
    confirm,
  };
}
