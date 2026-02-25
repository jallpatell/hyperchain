import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowNode } from "@shared/schema";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { getNodeMeta } from "../utils/nodeTypes";

interface NodeInspectorProps {
  node: WorkflowNode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, newData: Record<string, any>) => void;
  onDelete: (nodeId: string) => void;
}

export function NodeInspector({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: NodeInspectorProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (node) {
      setFormData(node.data || {});
    }
  }, [node]);

  const handleChange = (key: string, value: any) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    if (node) {
      onUpdate(node.id, newData);
    }
  };

  if (!node) return null;

  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] border-l border-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            {/* Icon badge — same style as the canvas node */}
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 border-2 ${meta.bgColor} ${meta.borderColor}`}
            >
              <Icon className={`w-5 h-5 ${meta.iconColor}`} />
            </div>

            <div className="flex flex-col">
              <SheetTitle className="text-xl capitalize leading-tight">
                {node.type.replace(/-/g, " ")} Node
              </SheetTitle>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${meta.iconColor}`}
              >
                {meta.type}
              </span>
            </div>
          </div>

          <SheetDescription className="mt-2">
            Configure the parameters for this step in your workflow.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Node Label */}
          <div className="space-y-2">
            <Label>Node Label</Label>
            <Input
              value={formData.label || node.type}
              onChange={(e) => handleChange("label", e.target.value)}
            />
          </div>

          {/* Dynamic fields by node type */}
          {node.type === "webhook" && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-2">
                <Label>HTTP Method</Label>
                <Select
                  value={formData.method || "GET"}
                  onValueChange={(val) => handleChange("method", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Path</Label>
                <Input
                  placeholder="/webhook/..."
                  value={formData.path || ""}
                  onChange={(e) => handleChange("path", e.target.value)}
                />
              </div>
            </div>
          )}

          {node.type === "http-request" && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://api.example.com/..."
                  value={formData.url || ""}
                  onChange={(e) => handleChange("url", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={formData.method || "GET"}
                  onValueChange={(val) => handleChange("method", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {["POST", "PUT"].includes(formData.method) && (
                <div className="space-y-2">
                  <Label>JSON Body</Label>
                  <Textarea
                    className="font-mono text-xs h-32"
                    placeholder="{ 'key': 'value' }"
                    value={formData.body || ""}
                    onChange={(e) => handleChange("body", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {node.type === "code" && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-2">
                <Label>JavaScript Code</Label>
                <Textarea
                  className="font-mono text-xs h-64 bg-slate-950 text-slate-50"
                  placeholder="return items[0].json;"
                  value={formData.code || ""}
                  onChange={(e) => handleChange("code", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: items, $node, $env
                </p>
              </div>
            </div>
          )}

          {node.type === "ai-chat" && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={formData.model || "gpt-4"}
                  onValueChange={(val) => handleChange("model", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  placeholder="You are a helpful assistant..."
                  value={formData.systemPrompt || ""}
                  onChange={(e) => handleChange("systemPrompt", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Output preview */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">Output Parameters</h4>
            <div className="bg-muted/50 p-3 rounded text-xs font-mono text-muted-foreground">
              {JSON.stringify({ id: node.id, ...formData }, null, 2)}
            </div>
          </div>

          {/* Delete */}
          <div>
            <Button
              variant="destructive"
              className="w-full bg-[#EF486F] flex items-center gap-2"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Current Node
            </Button>

            {confirmOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-background border rounded-xl shadow-xl p-6 w-[350px] animate-in fade-in zoom-in-95">
                  <h3 className="text-lg font-semibold mb-2">
                    Delete Current Node!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    <span className="font-mono text-red-600">WARNING:</span>{" "}
                    This action cannot be undone and may affect downstream
                    nodes. Are you sure you want to proceed?
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmOpen(false)}
                    >
                      No
                    </Button>
                    <Button
                      variant="destructive"
                      className="bg-[#EF486F]"
                      onClick={() => {
                        onDelete(node.id);
                        onClose();
                        setConfirmOpen(false);
                      }}
                    >
                      Yes, Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}