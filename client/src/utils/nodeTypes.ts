import { Webhook, Globe, Code, Bot, Database, Mail } from "lucide-react";

export const NODE_TYPES = [
  {
    type: "webhook",
    label: "Webhook",
    icon: Webhook,
    bgColor: "bg-[#c7700c]/10",
    iconColor: "text-[#c7700c]",
    borderColor: "border-[#c7700c]/30",
    dotColor: "bg-[#c7700c]",
  },
  {
    type: "http-request",
    label: "HTTP Request",
    icon: Globe,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  {
    type: "code",
    label: "Code",
    icon: Code,
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
    borderColor: "border-green-200",
    dotColor: "bg-green-500",
  },
  {
    type: "ai-chat",
    label: "AI Chat",
    icon: Bot,
    bgColor: "bg-[#EF486F]/10",
    iconColor: "text-[#EF486F]",
    borderColor: "border-[#EF486F]/30",
    dotColor: "bg-[#EF486F]",
  },
  {
    type: "database",
    label: "Database",
    icon: Database,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
    dotColor: "bg-purple-500",
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    borderColor: "border-red-200",
    dotColor: "bg-red-500",
  },
] as const;

export type NodeTypeMeta = (typeof NODE_TYPES)[number];

/** Resolve metadata by type string or label string — case-insensitive */
export function getNodeMeta(typeOrLabel: string): NodeTypeMeta {
  const normalized = (typeOrLabel || "").toLowerCase().trim();
  return (
    (NODE_TYPES.find(
      (n) =>
        n.type === normalized ||
        n.label.toLowerCase() === normalized ||
        n.label.toLowerCase().replace(/\s+/g, "-") === normalized
    ) as NodeTypeMeta) ?? NODE_TYPES[0]
  );
}