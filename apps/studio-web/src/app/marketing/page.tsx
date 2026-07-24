"use client";

import * as React from "react";
import { Sparkles, RotateCcw, Star, Check, Trash2 } from "lucide-react";
import { Button, Input, Select, Textarea, Badge } from "@bcp/ui";
import { apiGet, apiPost, apiPatch, apiFetch } from "../../lib/api-client";

const CONTENT_TYPES = [
  { value: "instagram_caption", label: "Instagram caption" }, { value: "reel_script", label: "Reel script" }, { value: "hashtags", label: "Hashtags" },
  { value: "facebook_post", label: "Facebook post" }, { value: "google_business_post", label: "Google Business post" }, { value: "email_campaign", label: "Email campaign" },
  { value: "whatsapp_campaign", label: "WhatsApp campaign" }, { value: "festival_greeting", label: "Festival greeting" }, { value: "review_request", label: "Review request" },
  { value: "referral_campaign", label: "Referral campaign" }, { value: "package_description", label: "Package description" }, { value: "seo_title", label: "SEO title" }, { value: "blog_outline", label: "Blog outline" },
];
const LANGUAGES = [{ value: "english", label: "English" }, { value: "tamil", label: "Tamil" }, { value: "kannada", label: "Kannada" }, { value: "telugu", label: "Telugu" }, { value: "hindi", label: "Hindi" }];

interface ContentRequest { id: string; contentType: string; language: string; generatedContent: string; isApproved: boolean; savedAsBrandExample: boolean }
interface BrandExample { id: string; contentType: string; content: string }
interface BrandVoiceSettings { toneDescription: string | null; keyPhrases: string[]; avoidPhrases: string[] }

export default function MarketingPage() {
  const [contentType, setContentType] = React.useState("instagram_caption");
  const [language, setLanguage] = React.useState("english");
  const [service, setService] = React.useState("");
  const [city, setCity] = React.useState("");
  const [targetAudience, setTargetAudience] = React.useState("");
  const [tone, setTone] = React.useState("");
  const [offer, setOffer] = React.useState("");
  const [platform, setPlatform] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [current, setCurrent] = React.useState<ContentRequest | null>(null);
  const [history, setHistory] = React.useState<ContentRequest[]>([]);
  const [examples, setExamples] = React.useState<BrandExample[]>([]);
  const [voiceSettings, setVoiceSettings] = React.useState<BrandVoiceSettings>({ toneDescription: null, keyPhrases: [], avoidPhrases: [] });
  const [showVoiceSettings, setShowVoiceSettings] = React.useState(false);

  const load = React.useCallback(async () => {
    const [historyRes, examplesRes, voiceRes] = await Promise.all([
      apiGet<ContentRequest[]>("/marketing/requests"),
      apiGet<BrandExample[]>("/marketing/brand-examples"),
      apiGet<BrandVoiceSettings>("/marketing/brand-voice"),
    ]);
    if (historyRes.ok && historyRes.data) setHistory(historyRes.data);
    if (examplesRes.ok && examplesRes.data) setExamples(examplesRes.data);
    if (voiceRes.ok && voiceRes.data) setVoiceSettings(voiceRes.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await apiPost<ContentRequest>("/marketing/generate", { contentType, language, service: service || undefined, city: city || undefined, targetAudience: targetAudience || undefined, tone: tone || undefined, offer: offer || undefined, platform: platform || undefined });
    setGenerating(false);
    if (res.ok && res.data) {
      setCurrent(res.data);
      await load();
    }
  }

  async function handleRegenerate() {
    if (!current) return;
    setGenerating(true);
    const res = await apiPost<ContentRequest>(`/marketing/requests/${current.id}/regenerate`);
    setGenerating(false);
    if (res.ok && res.data) {
      setCurrent(res.data);
      await load();
    }
  }

  async function handleApprove() {
    if (!current) return;
    await apiPatch(`/marketing/requests/${current.id}/approve`, { isApproved: true });
    await load();
  }

  async function handleSaveExample() {
    if (!current) return;
    await apiPost("/marketing/brand-examples", { requestId: current.id });
    await load();
  }

  async function handleDeleteExample(id: string) {
    await apiFetch(`/marketing/brand-examples/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleSaveVoiceSettings() {
    await apiPatch("/marketing/brand-voice", voiceSettings);
    setShowVoiceSettings(false);
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-2xl"><Sparkles className="h-5 w-5" aria-hidden="true" />Marketing Studio</h1>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowVoiceSettings((v) => !v)}>Brand voice</Button>
      </div>

      {showVoiceSettings && (
        <div className="mb-6 flex flex-col gap-2 rounded-md border border-border p-3">
          <Textarea placeholder="Describe your studio's tone (e.g. warm, playful, never salesy)" rows={2} value={voiceSettings.toneDescription ?? ""} onChange={(e) => setVoiceSettings((s) => ({ ...s, toneDescription: e.target.value }))} />
          <Input placeholder="Key phrases (comma-separated)" value={voiceSettings.keyPhrases.join(", ")} onChange={(e) => setVoiceSettings((s) => ({ ...s, keyPhrases: e.target.value.split(",").map((p) => p.trim()).filter(Boolean) }))} />
          <Input placeholder="Phrases to avoid (comma-separated)" value={voiceSettings.avoidPhrases.join(", ")} onChange={(e) => setVoiceSettings((s) => ({ ...s, avoidPhrases: e.target.value.split(",").map((p) => p.trim()).filter(Boolean) }))} />
          <Button type="button" size="sm" className="self-start" onClick={() => void handleSaveVoiceSettings()}>Save</Button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
        <Select value={contentType} onChange={(e) => setContentType(e.target.value)} options={CONTENT_TYPES} />
        <Select value={language} onChange={(e) => setLanguage(e.target.value)} options={LANGUAGES} />
        <Input placeholder="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)} />
        <Input placeholder="Service" value={service} onChange={(e) => setService(e.target.value)} />
        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input placeholder="Target audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
        <Input placeholder="Tone" value={tone} onChange={(e) => setTone(e.target.value)} />
        <Input placeholder="Offer" value={offer} onChange={(e) => setOffer(e.target.value)} className="col-span-2" />
        <Button type="button" disabled={generating} onClick={() => void handleGenerate()} className="col-span-2 sm:col-span-3">{generating ? "Generating…" : "Generate"}</Button>
      </div>

      {current && (
        <div className="mb-8 rounded-md border border-border p-4">
          <p className="mb-3 whitespace-pre-wrap text-sm">{current.generatedContent}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void handleRegenerate()}><RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Regenerate</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleApprove()} disabled={current.isApproved}><Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{current.isApproved ? "Approved" : "Approve"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleSaveExample()} disabled={current.savedAsBrandExample}><Star className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{current.savedAsBrandExample ? "Saved as example" : "Save as brand example"}</Button>
          </div>
        </div>
      )}

      <h2 className="mb-2 font-display text-lg">Saved brand examples</h2>
      <ul className="mb-8 flex flex-col divide-y divide-border rounded-md border border-border text-sm">
        {examples.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 p-2">
            <div>
              <Badge variant="outline" className="mb-1 capitalize">{e.contentType.replace(/_/g, " ")}</Badge>
              <p className="text-xs text-muted-foreground">{e.content.slice(0, 140)}{e.content.length > 140 ? "…" : ""}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => void handleDeleteExample(e.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
          </li>
        ))}
        {examples.length === 0 && <li className="p-2 text-xs text-muted-foreground">No saved examples yet — approve and save a generated result to build your studio&apos;s voice.</li>}
      </ul>

      <h2 className="mb-2 font-display text-lg">History</h2>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
        {history.map((h) => (
          <li key={h.id}>
            <button type="button" onClick={() => setCurrent(h)} className="flex w-full items-center justify-between p-2 text-left hover:bg-accent">
              <Badge variant="outline" className="capitalize">{h.contentType.replace(/_/g, " ")}</Badge>
              <span className="truncate px-2 text-xs text-muted-foreground">{h.generatedContent.slice(0, 60)}</span>
              {h.isApproved && <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />}
            </button>
          </li>
        ))}
        {history.length === 0 && <li className="p-2 text-xs text-muted-foreground">No content generated yet.</li>}
      </ul>
    </main>
  );
}
