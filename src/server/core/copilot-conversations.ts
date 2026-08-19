import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const missingSchema = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("schema cache")));

const cleanTitle = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 160) || "PrizeSkout conversation";

export async function listCopilotConversations(accountId: string) {
  const { data, error } = await (supabaseAdmin.from("ps_copilot_conversations" as never) as any)
    .select("id,title,status,current_task_id,last_message_at,created_at,updated_at")
    .eq("account_id", accountId).eq("status", "active").order("last_message_at", { ascending: false }).limit(30);
  if (missingSchema(error)) return { available: false, conversations: [] };
  if (error) throw error;
  return { available: true, conversations: data ?? [] };
}

export async function getCopilotConversation(accountId: string, id: string) {
  const conversation = await (supabaseAdmin.from("ps_copilot_conversations" as never) as any)
    .select("id,title,status,current_task_id,context,last_message_at,created_at,updated_at")
    .eq("account_id", accountId).eq("id", id).maybeSingle();
  if (missingSchema(conversation.error)) return { available: false, conversation: null, messages: [] };
  if (conversation.error) throw conversation.error;
  if (!conversation.data) throw new Error("Conversation not found.");
  const messages = await (supabaseAdmin.from("ps_copilot_messages" as never) as any)
    .select("id,role,message_type,content,task_id,metadata,created_at")
    .eq("account_id", accountId).eq("conversation_id", id).order("created_at").order("id").limit(200);
  if (messages.error) throw messages.error;
  return { available: true, conversation: conversation.data, messages: messages.data ?? [] };
}

export async function createCopilotConversation(accountId: string, title: string, context?: Record<string, unknown>) {
  const { data, error } = await (supabaseAdmin.from("ps_copilot_conversations" as never) as any)
    .insert({ account_id: accountId, title: cleanTitle(title), context: (context ?? {}) as Json })
    .select("id,title,status,current_task_id,last_message_at,created_at,updated_at").single();
  if (missingSchema(error)) return { available: false, conversation: null };
  if (error) throw error;
  return { available: true, conversation: data };
}

export async function addCopilotMessage(accountId: string, input: { conversationId: string; role: string; content: string; messageType?: string; taskId?: string | null; metadata?: Record<string, unknown> }) {
  if (!["user", "assistant", "system"].includes(input.role)) throw new Error("Choose a valid conversation role.");
  const content = input.content.trim();
  if (!content || content.length > 12000) throw new Error("Conversation messages must contain 1 to 12,000 characters.");
  const allowedTypes = ["text", "task", "approval", "execution", "evidence", "error"];
  const messageType = allowedTypes.includes(input.messageType ?? "") ? input.messageType! : "text";
  const owner = await (supabaseAdmin.from("ps_copilot_conversations" as never) as any).select("id").eq("account_id", accountId).eq("id", input.conversationId).eq("status", "active").maybeSingle();
  if (missingSchema(owner.error)) return { available: false, message: null };
  if (owner.error) throw owner.error;
  if (!owner.data) throw new Error("Conversation not found or archived.");
  const { data, error } = await (supabaseAdmin.from("ps_copilot_messages" as never) as any)
    .insert({ account_id: accountId, conversation_id: input.conversationId, role: input.role, message_type: messageType, content, task_id: input.taskId ?? null, metadata: (input.metadata ?? {}) as Json })
    .select("id,role,message_type,content,task_id,metadata,created_at").single();
  if (error) throw error;
  await (supabaseAdmin.from("ps_copilot_conversations" as never) as any).update({ last_message_at: new Date().toISOString(), ...(input.taskId ? { current_task_id: input.taskId } : {}) }).eq("account_id", accountId).eq("id", input.conversationId);
  return { available: true, message: data };
}

export async function archiveCopilotConversation(accountId: string, id: string) {
  const { data, error } = await (supabaseAdmin.from("ps_copilot_conversations" as never) as any).update({ status: "archived" }).eq("account_id", accountId).eq("id", id).select("id,status").maybeSingle();
  if (missingSchema(error)) return { available: false, conversation: null };
  if (error) throw error;
  if (!data) throw new Error("Conversation not found.");
  return { available: true, conversation: data };
}

export async function linkCopilotTask(accountId: string, conversationId: string, taskId: string) {
  const { data, error } = await (supabaseAdmin.from("ps_store_manager_tasks" as never) as any).update({ conversation_id: conversationId }).eq("account_id", accountId).eq("id", taskId).select("id,conversation_id").maybeSingle();
  if (missingSchema(error)) return { available: false, task: null };
  if (error) throw error;
  if (!data) throw new Error("Task not found.");
  await (supabaseAdmin.from("ps_copilot_conversations" as never) as any).update({ current_task_id: taskId }).eq("account_id", accountId).eq("id", conversationId);
  return { available: true, task: data };
}
