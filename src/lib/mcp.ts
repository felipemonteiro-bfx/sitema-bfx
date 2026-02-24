import { aiActions, executeAiAction, type ActionContext } from "@/lib/ai-actions";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export function listMcpTools(ctx: ActionContext, mode: "plan" | "execute" = "execute") {
  return aiActions
    .filter((action) => (mode === "plan" ? action.readOnly === true : true))
    .map((action): McpTool => ({
      name: action.name,
      description: action.description,
      inputSchema: (action as any).parameters ?? {},
    }));
}

export async function callMcpTool(
  name: string,
  params: Record<string, unknown>,
  ctx: ActionContext
) {
  return executeAiAction(name, params, ctx);
}
