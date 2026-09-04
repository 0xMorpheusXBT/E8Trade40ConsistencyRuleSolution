import { createFileRoute } from "@tanstack/react-router";
import { CatalogGrid } from "@/components/desk/catalog-grid";
import { Shell } from "@/components/desk/shell";

export const Route = createFileRoute("/catalog")({ component: CatalogPage });

function CatalogPage() {
  return (
    <Shell>
      <CatalogGrid />
    </Shell>
  );
}
