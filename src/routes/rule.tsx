import { createFileRoute } from "@tanstack/react-router";
import { RuleGuide } from "@/components/desk/rule-guide";
import { Shell } from "@/components/desk/shell";

export const Route = createFileRoute("/rule")({ component: RulePage });

function RulePage() {
  return (
    <Shell>
      <RuleGuide />
    </Shell>
  );
}
