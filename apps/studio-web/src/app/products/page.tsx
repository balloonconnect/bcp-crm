"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState, Input, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

const CATEGORY_OPTIONS = [
  { value: "softcopy", label: "Softcopy" }, { value: "print", label: "Print" }, { value: "album", label: "Album" },
  { value: "frame", label: "Frame" }, { value: "canvas", label: "Canvas" }, { value: "acrylic", label: "Acrylic" },
  { value: "calendar", label: "Calendar" }, { value: "photo_book", label: "Photo book" }, { value: "gift", label: "Gift" },
];

interface Variant { id: string; size: string | null; finish: string | null; quantityTier: string | null; priceInPaise: number }
interface ProductRecord { id: string; category: string; name: string; basePriceInPaise: number; isActive: boolean; variants: Variant[] }
interface Coupon { id: string; code: string; discountType: string; discountValue: number; usedCount: number; maxUses: number | null }

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function ProductsPage() {
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("print");
  const [basePrice, setBasePrice] = React.useState("");
  const [variantProductId, setVariantProductId] = React.useState<string | null>(null);
  const [variantSize, setVariantSize] = React.useState("");
  const [variantFinish, setVariantFinish] = React.useState("");
  const [variantPrice, setVariantPrice] = React.useState("");
  const [couponCode, setCouponCode] = React.useState("");
  const [couponValue, setCouponValue] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    const [productsRes, couponsRes] = await Promise.all([apiGet<ProductRecord[]>("/products"), apiGet<Coupon[]>("/coupons")]);
    if (productsRes.ok && productsRes.data) setProducts(productsRes.data);
    if (couponsRes.ok && couponsRes.data) setCoupons(couponsRes.data);
    setLoading(false);
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
    if (!variantPrice) return;
    await apiPost(`/products/${productId}/variants`, { size: variantSize || undefined, finish: variantFinish || undefined, priceInPaise: Math.round(Number(variantPrice) * 100) });
    setVariantProductId(null); setVariantSize(""); setVariantFinish(""); setVariantPrice("");
    await load();
  }

  async function handleCreateCoupon() {
    if (!couponCode.trim() || !couponValue) return;
    await apiPost("/coupons", { code: couponCode, discountType: "percentage", discountValue: Number(couponValue) });
    setCouponCode(""); setCouponValue("");
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-2xl">Products</h1>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <Input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORY_OPTIONS} className="w-40" />
        <Input type="number" placeholder="Base price (₹)" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-36" />
        <Button type="button" size="sm" onClick={() => void handleCreateProduct()}><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />Add product</Button>
      </div>

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product above — prints, canvas, albums, and more." />
      ) : (
        <ul className="mb-8 flex flex-col divide-y divide-border rounded-md border border-border">
          {products.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{p.category.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted-foreground">from {formatPaise(p.basePriceInPaise)}</span>
                </div>
              </div>
              {p.variants.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {p.variants.map((v) => <Badge key={v.id} variant="outline">{[v.size, v.finish, v.quantityTier].filter(Boolean).join(" / ") || "Variant"}: {formatPaise(v.priceInPaise)}</Badge>)}
                </ul>
              )}
              {variantProductId === p.id ? (
                <div className="flex gap-2">
                  <Input placeholder="Size" value={variantSize} onChange={(e) => setVariantSize(e.target.value)} className="h-8 w-24 text-xs" />
                  <Input placeholder="Finish" value={variantFinish} onChange={(e) => setVariantFinish(e.target.value)} className="h-8 w-24 text-xs" />
                  <Input type="number" placeholder="Price (₹)" value={variantPrice} onChange={(e) => setVariantPrice(e.target.value)} className="h-8 w-28 text-xs" />
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleAddVariant(p.id)}>Save</Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => setVariantProductId(p.id)}>+ Add variant</Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 font-display text-xl">Coupons</h2>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <Input placeholder="Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="w-40" />
        <Input type="number" placeholder="Discount %" value={couponValue} onChange={(e) => setCouponValue(e.target.value)} className="w-32" />
        <Button type="button" size="sm" variant="outline" onClick={() => void handleCreateCoupon()}>Add coupon</Button>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
        {coupons.map((c) => (
          <li key={c.id} className="flex justify-between p-2">
            <span className="font-mono">{c.code}</span>
            <span className="text-xs text-muted-foreground">{c.discountType === "percentage" ? `${c.discountValue}%` : formatPaise(c.discountValue)} · used {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</span>
          </li>
        ))}
        {coupons.length === 0 && <li className="p-2 text-xs text-muted-foreground">No coupons yet.</li>}
      </ul>
    </main>
  );
}
