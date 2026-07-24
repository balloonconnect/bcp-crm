"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Input, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

const CATEGORY_OPTIONS = [
  { value: "softcopy", label: "Softcopy" }, { value: "print", label: "Print" }, { value: "album", label: "Album" },
  { value: "frame", label: "Frame" }, { value: "canvas", label: "Canvas" }, { value: "acrylic", label: "Acrylic" },
  { value: "calendar", label: "Calendar" }, { value: "photo_book", label: "Photo book" }, { value: "gift", label: "Gift" },
];

interface Variant { id: string; size: string | null; finish: string | null; quantityTier: string | null; priceInPaise: number }
interface ProductRecord { id: string; category: string; name: string; basePriceInPaise: number; variants: Variant[] }

export function ProductsPanel() {
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [category, setCategory] = React.useState("print");
  const [name, setName] = React.useState("");
  const [basePrice, setBasePrice] = React.useState("");
  const [variantTargets, setVariantTargets] = React.useState<Record<string, { size: string; finish: string; price: string }>>({});

  const load = React.useCallback(async () => {
    const res = await apiGet<ProductRecord[]>("/products");
    if (res.ok && res.data) setProducts(res.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateProduct() {
    if (!name.trim() || !basePrice) return;
    await apiPost("/products", { category, name, basePriceInPaise: Math.round(Number(basePrice) * 100) });
    setName(""); setBasePrice("");
    await load();
  }

  async function handleAddVariant(productId: string) {
    const target = variantTargets[productId];
    if (!target?.price) return;
    await apiPost(`/products/${productId}/variants`, { size: target.size || undefined, finish: target.finish || undefined, priceInPaise: Math.round(Number(target.price) * 100) });
    setVariantTargets((prev) => ({ ...prev, [productId]: { size: "", finish: "", price: "" } }));
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Products</h3>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORY_OPTIONS} className="w-40" />
        <Input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="number" placeholder="Base price (₹)" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-32" />
        <Button type="button" size="sm" onClick={() => void handleCreateProduct()}><Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Add product</Button>
      </div>

      <ul className="flex flex-col gap-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{p.name}</span>
              <Badge variant="outline" className="capitalize">{p.category.replace(/_/g, " ")}</Badge>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Base: ₹{(p.basePriceInPaise / 100).toLocaleString("en-IN")}</p>
            <ul className="mb-2 flex flex-wrap gap-2">
              {p.variants.map((v) => (
                <Badge key={v.id} variant="outline">{[v.size, v.finish, v.quantityTier].filter(Boolean).join(" / ") || "Variant"}: ₹{(v.priceInPaise / 100).toLocaleString("en-IN")}</Badge>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input placeholder="Size" value={variantTargets[p.id]?.size ?? ""} onChange={(e) => setVariantTargets((prev) => ({ ...prev, [p.id]: { ...prev[p.id], size: e.target.value, finish: prev[p.id]?.finish ?? "", price: prev[p.id]?.price ?? "" } }))} className="h-8 w-24 text-xs" />
              <Input placeholder="Finish" value={variantTargets[p.id]?.finish ?? ""} onChange={(e) => setVariantTargets((prev) => ({ ...prev, [p.id]: { ...prev[p.id], finish: e.target.value, size: prev[p.id]?.size ?? "", price: prev[p.id]?.price ?? "" } }))} className="h-8 w-24 text-xs" />
              <Input type="number" placeholder="Price ₹" value={variantTargets[p.id]?.price ?? ""} onChange={(e) => setVariantTargets((prev) => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value, size: prev[p.id]?.size ?? "", finish: prev[p.id]?.finish ?? "" } }))} className="h-8 w-24 text-xs" />
              <Button type="button" size="sm" variant="outline" onClick={() => void handleAddVariant(p.id)}>Add variant</Button>
            </div>
          </li>
        ))}
        {products.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
      </ul>
    </div>
  );
}
