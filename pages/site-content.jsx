import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import {
  FiCheck, FiAlertCircle, FiPlus, FiTrash2, FiArrowUp, FiArrowDown,
  FiEdit2, FiX, FiImage, FiUpload,
} from "react-icons/fi";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

const BLANK_CARD = {
  id: null, product_id: "", name: "", notes: "", origin: "", image: "", is_coming_soon: false,
};

// Every picture a card could use, best first: whatever was typed here, then
// the product's own photo. A bare file name means an image already on the
// site, in its product-images folder. The list is tried in order, so a card
// naming a file that is no longer on the server still shows its product photo.
// A picture: upload one, or type the address of a file already on the site.
function ImageField({ label, hint, value, onChange, api, nameSeed, note }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const choose = async (file) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      if (nameSeed) fd.append("name", nameSeed);
      const res = await api("post", "/site_content_image", fd);
      if (res.data?.status && res.data.url) onChange(res.data.url);
      else setError(res.data?.message || "The picture could not be uploaded.");
    } catch (err) {
      setError(err?.response?.data?.message || "The picture could not be uploaded.");
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}

      <div className="mt-1.5 flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          <Thumb sources={value ? [resolveImage(value)] : []} className="h-full w-full" iconSize={18} />
        </div>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={value || ""}
            maxLength={255}
            placeholder="/product-images/heritage.jpeg"
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D5AD4D]"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-[#D5AD4D] disabled:opacity-50"
            >
              <FiUpload size={13} /> {busy ? "Uploading…" : "Upload a picture"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs font-semibold text-gray-400 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {error && <p className="mt-1.5 text-[11px] text-red-600">{error}</p>}
          {note}
        </div>
      </div>
    </div>
  );
}

function resolveImage(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  if (/^https?:/i.test(v)) return v;
  if (v.startsWith("/")) return `${API_ORIGIN}${v}`;
  return `${API_ORIGIN}/product-images/${v}`;
}

function cardImages(card, products) {
  const out = [];
  const typed = String(card.image || "").trim();
  if (typed) {
    if (/^https?:/i.test(typed)) out.push(typed);
    else if (typed.startsWith("/")) out.push(`${API_ORIGIN}${typed}`);
    else out.push(`${API_ORIGIN}/product-images/${typed}`);
  }
  const product = products.find((p) => String(p.id) === String(card.product_id));
  const fromProduct = card.product_img || product?.primary_img;
  if (fromProduct) out.push(fromProduct);
  return out;
}

// Tries each picture in turn, and shows the placeholder rather than a broken
// image once none of them load. onFallback reports when the first choice was
// not usable, so the editor can say so.
function Thumb({ sources = [], className = "", iconSize = 26, onFallback }) {
  const [index, setIndex] = useState(0);
  const key = sources.join("|");
  useEffect(() => { setIndex(0); }, [key]);

  const src = sources[index];
  if (!src) {
    return (
      <div className={`grid place-items-center text-gray-300 ${className}`}>
        <FiImage size={iconSize} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => {
        setIndex((i) => i + 1);
        if (onFallback) onFallback();
      }}
      className={`object-cover ${className}`}
    />
  );
}

// Shows the heading the way the website will draw it: a lone "|" starts a new
// line, and *a word* is set in italic.
function TitlePreview({ title }) {
  const words = String(title || "").split(" ").filter(Boolean);
  if (!words.length) return <span className="text-gray-300">Nothing yet</span>;

  return (
    <span className="font-serif text-2xl leading-tight text-gray-900">
      {words.map((w, i) => {
        if (w === "|") return <br key={i} />;
        const highlighted = w.startsWith("*") && w.endsWith("*") && w.length > 1;
        return (
          <Fragment key={i}>
            {highlighted ? <em className="italic text-[#7C5C19]">{w.slice(1, -1)}</em> : w}{" "}
          </Fragment>
        );
      })}
    </span>
  );
}

function Field({ label, hint, value, onChange, textarea = false, maxLength, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D5AD4D] resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D5AD4D]"
        />
      )}
    </label>
  );
}

// A card drawn roughly as the website draws it, so the list reads at a glance.
function CardTile({ card, products, index, count, onEdit, onDelete, onMove }) {
  const imgs = cardImages(card, products);
  const product = products.find((p) => String(p.id) === String(card.product_id));
  const name = card.name || product?.prod_name || "Untitled card";
  // Flagged on the tile so a card the website treats differently from this
  // screen is caught at a glance, instead of by opening all fifteen.
  const warning = cardWarning(card, products);

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-[#D5AD4D] transition-colors">
      <div className="relative aspect-[4/5] bg-gray-50">
        <Thumb sources={imgs} className="absolute inset-0 h-full w-full" />

        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-500 backdrop-blur">
          {index + 1}
        </span>

        {card.is_coming_soon && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
            Coming soon
          </span>
        )}

        {/* Actions appear on hover, and are always reachable by keyboard. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button onClick={() => onEdit(card)} title="Edit this card"
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-[#D5AD4D] hover:text-[#1B1406]">
            <FiEdit2 size={12} /> Edit
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => onMove(card.id, -1)} disabled={index === 0} title="Move earlier"
              className="rounded-lg bg-white/90 p-1.5 text-gray-600 hover:bg-white disabled:opacity-30">
              <FiArrowUp size={12} />
            </button>
            <button onClick={() => onMove(card.id, 1)} disabled={index === count - 1} title="Move later"
              className="rounded-lg bg-white/90 p-1.5 text-gray-600 hover:bg-white disabled:opacity-30">
              <FiArrowDown size={12} />
            </button>
            <button onClick={() => onDelete(card)} title="Remove this card"
              className="rounded-lg bg-white/90 p-1.5 text-red-500 hover:bg-white">
              <FiTrash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        {card.notes && <p className="text-xs italic text-gray-500 truncate">{card.notes}</p>}
        {card.origin && <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-2">{card.origin}</p>}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {product ? product.prod_name : "No product linked"}
        </p>
        {warning && (
          <button
            onClick={() => onEdit(card)}
            className="mt-2 w-full rounded-lg bg-amber-50 px-2 py-1.5 text-left text-[10px] font-bold leading-snug text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100"
          >
            {warning.short} — fix
          </button>
        )}
      </div>
    </div>
  );
}

// A product the website can actually sell: published, with a price.
function isOnSale(product) {
  return !!product && Number(product.status) === 1;
}

/**
 * Why this card will read "Coming soon" on the website, if it will.
 *
 * The storefront decides for itself (frontend/src/pages/Tea.jsx): a card shows
 * "Coming soon" when the box is ticked, OR when it cannot find a live product
 * behind the card at all. That second half is invisible here, which is what
 * makes a card with the box clearly unticked still say "Coming soon" on the
 * site. This spells the reason out instead of leaving it to be guessed.
 *
 * Returns null when the card behaves the way the screen suggests it will.
 */
function cardWarning(card, products) {
  const product = products.find((p) => String(p.id) === String(card.product_id));

  if (card.is_coming_soon) {
    // Ticked over something already on sale: the card refuses to sell it.
    if (isOnSale(product)) {
      return {
        short: "On sale, but this card will not sell it",
        long: `${product.prod_name} is published and on sale, but “Coming soon” hides its price and its link, so this card offers a WhatsApp message instead of an Add to cart button.`,
        fix: "untick",
      };
    }
    return null; // A deliberate placeholder. Nothing wrong with it.
  }

  // From here the box is UNTICKED, yet the website may still say "Coming soon".
  if (!product) {
    return {
      short: "No product linked — the site still says “Coming soon”",
      long: "“Coming soon” is not ticked, but the website shows it anyway, because this card is not linked to a product. Until one is picked above, the card is not clickable and nobody can buy from it.",
      fix: "link",
    };
  }

  if (Number(product.status) !== 1) {
    return {
      short: "Product is Inactive — the site still says “Coming soon”",
      long: `${product.prod_name} is set to Inactive under Products, so the website cannot sell it and falls back to “Coming soon”. Set that product to Active to sell it here.`,
      fix: "activate",
    };
  }

  return null;
}

// Editing happens in one dialog, so only one card is in play at a time.
function CardDialog({ open, card, products, saving, onClose, onSave, api }) {
  const [draft, setDraft] = useState(card || BLANK_CARD);
  // Set when the file named in Picture cannot be loaded, so the editor can
  // explain why the product's photo is being shown instead.
  const [typedMissing, setTypedMissing] = useState(false);
  useEffect(() => { setDraft(card || BLANK_CARD); }, [card]);
  useEffect(() => { setTypedMissing(false); }, [draft.image, draft.product_id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const product = products.find((p) => String(p.id) === String(draft.product_id));
  const imgs = cardImages(draft, products);
  // Whether the website will say "Coming soon" against what this screen shows.
  const warning = cardWarning(draft, products);

  // Picking a product that is already selling almost always means the card
  // should stop saying "Coming soon", so it is switched off here rather than
  // left as a trap. Tick it again if the badge is still wanted.
  const pickProduct = (id) => {
    set("product_id", id);
    if (isOnSale(products.find((p) => String(p.id) === String(id)))) {
      set("is_coming_soon", false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {draft.id ? "Edit card" : "Add a card"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <FiX size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[180px,1fr]">
          {/* What it will look like */}
          <div>
            <div className="aspect-[4/5] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <Thumb
                sources={imgs}
                className="h-full w-full"
                iconSize={24}
                onFallback={() => setTypedMissing(true)}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {draft.name || product?.prod_name || "Untitled card"}
            </p>
            {draft.notes && <p className="text-xs italic text-gray-500">{draft.notes}</p>}
            {draft.origin && <p className="mt-0.5 text-[11px] text-gray-400">{draft.origin}</p>}
            <p className="mt-2 text-xs font-bold text-gray-700">
              {draft.is_coming_soon ? "Coming soon" : "Price from the product"}
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Product</span>
              <span className="block text-[11px] text-gray-400 mt-0.5">
                The card takes its photo, price and link from the product you pick.
                Leave it blank for a tea that is not in the catalogue yet.
              </span>
              <select
                value={draft.product_id || ""}
                onChange={(e) => pickProduct(e.target.value)}
                className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D5AD4D] bg-white"
              >
                <option value="">— No product (placeholder card) —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.prod_name}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name on the card" placeholder={product?.prod_name || "e.g. Premium Long Leaf"}
                hint="Blank uses the product's own name."
                value={draft.name || ""} maxLength={191} onChange={(v) => set("name", v)} />
              <Field label="Italic line" placeholder="e.g. White Tea"
                value={draft.notes || ""} maxLength={191} onChange={(v) => set("notes", v)} />
            </div>

            <Field label="Small line underneath" placeholder="e.g. Himalayan Hills"
              value={draft.origin || ""} maxLength={1000} onChange={(v) => set("origin", v)} />

            <ImageField
              label="Picture"
              hint="Blank uses the product's photo. Upload one here to override it."
              value={draft.image}
              onChange={(v) => set("image", v)}
              api={api}
              nameSeed={draft.name || "card"}
              note={typedMissing && draft.image ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-700">
                  <FiAlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    “{draft.image}” is not on the website, so the product’s own photo is being used.
                    Clear this field to keep it that way.
                  </span>
                </p>
              ) : null}
            />

            <label
              className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer ${
                warning?.fix === "untick" ? "border-amber-400 bg-amber-50" : "border-gray-200"
              }`}
            >
              <input
                type="checkbox"
                checked={!!draft.is_coming_soon}
                onChange={(e) => set("is_coming_soon", e.target.checked)}
                className="mt-0.5 rounded accent-[#7C5C19] w-4 h-4"
              />
              <span>
                <span className="block text-xs font-semibold text-gray-700">Coming soon</span>
                <span className="block text-[11px] text-gray-400">
                  Shows “Coming soon” and a WhatsApp link instead of a price — even if the product is on sale.
                </span>
              </span>
            </label>

            {warning && (
              <div className="rounded-xl border border-amber-400 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-900">{warning.short}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800">{warning.long}</p>
                {warning.fix === "untick" && (
                  <button
                    type="button"
                    onClick={() => set("is_coming_soon", false)}
                    className="mt-2.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-700"
                  >
                    Turn “Coming soon” off
                  </button>
                )}
                {warning.fix === "activate" && (
                  <a
                    href="/products"
                    className="mt-2.5 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-700"
                  >
                    Open Products to set it Active
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1B1406] bg-[#D5AD4D] hover:bg-[#C1913C] disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : draft.id ? "Save card" : "Add card"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SiteContent() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();

  const [sections, setSections] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savingCard, setSavingCard] = useState(false);
  const [editing, setEditing] = useState(null); // { sectionKey, card }
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contentRes, productRes] = await Promise.all([
        api("get", "/site_contents"),
        api("get", "/get_products"),
      ]);
      const list = contentRes.data?.sections || [];
      setSections(list);
      setDrafts(Object.fromEntries(list.map((s) => [s.section_key, { ...s }])));
      setProducts(Array.isArray(productRes.data?.productList) ? productRes.data.productList : []);
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Could not load the website sections.",
      });
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const edit = (key, field, value) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));

  const isDirty = (key) => {
    const original = sections.find((s) => s.section_key === key);
    const draft = drafts[key];
    if (!original || !draft) return false;
    return ["eyebrow", "title", "intro", "image", "cta_label", "cta_link"]
      .some((f) => (original[f] || "") !== (draft[f] || ""));
  };

  const saveSection = async (key) => {
    setSavingKey(key);
    setMessage(null);
    try {
      const draft = drafts[key];
      const res = await api("post", "/site_contents", {
        section_key: key,
        eyebrow: draft.eyebrow,
        title: draft.title,
        intro: draft.intro,
        image: draft.image,
        cta_label: draft.cta_label,
        cta_link: draft.cta_link,
      });
      if (res.data?.status) {
        setSections((list) => list.map((s) => (s.section_key === key ? { ...s, ...draft } : s)));
        setMessage({ type: "success", text: "Saved. The website shows the new wording straight away." });
      } else {
        setMessage({ type: "error", text: res.data?.message || "Could not save that section." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Could not save that section." });
    }
    setSavingKey(null);
  };

  const saveCard = async (card) => {
    if (!editing) return;
    setSavingCard(true);
    setMessage(null);
    try {
      const res = await api("post", "/site_content_item", {
        id: card.id || undefined,
        section_key: editing.sectionKey,
        product_id: card.product_id || null,
        name: card.name,
        notes: card.notes,
        origin: card.origin,
        image: card.image,
        is_coming_soon: card.is_coming_soon ? 1 : 0,
      });
      if (res.data?.status) {
        setEditing(null);
        setMessage({ type: "success", text: res.data.message || "Card saved." });
        await load();
      } else {
        setMessage({ type: "error", text: res.data?.message || "Could not save that card." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Could not save that card." });
    }
    setSavingCard(false);
  };

  const deleteCard = async (card) => {
    const label = card.name || card.product_name || "this card";
    if (!window.confirm(`Remove ${label} from the website?`)) return;
    try {
      const res = await api("get", `/delete_site_content_item/${card.id}`);
      if (res.data?.status) {
        setMessage({ type: "success", text: "Card removed." });
        await load();
      } else {
        setMessage({ type: "error", text: res.data?.message || "Could not remove that card." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Could not remove that card." });
    }
  };

  const moveCard = async (sectionKey, id, direction) => {
    const section = sections.find((s) => s.section_key === sectionKey);
    const items = [...(section?.items || [])];
    const from = items.findIndex((i) => i.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];

    // Show the new order at once, then persist it.
    setSections((list) => list.map((s) => (s.section_key === sectionKey ? { ...s, items } : s)));
    try {
      await api("post", "/site_content_items_order", { order: items.map((i) => i.id) });
    } catch {
      setMessage({ type: "error", text: "Could not save the new order." });
      await load();
    }
  };

  if (!ready) return null;

  return (
    <AdminLayout title="Website Content">
      <Head><title>Website Content — C&W Admin</title></Head>

      {message && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-700 border border-green-100"
            : "bg-red-50 text-red-600 border border-red-100"
        }`}>
          {message.type === "success" ? <FiCheck size={16} /> : <FiAlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" />
      ) : !sections.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400 text-sm">
          No editable sections yet.
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-gray-500">
            The headings and product cards on the website. Changes appear on the site on their own —
            nothing needs to be rebuilt or uploaded.
          </p>

          {sections.map((section) => {
            const draft = drafts[section.section_key] || {};
            const dirty = isDirty(section.section_key);
            const saving = savingKey === section.section_key;
            const items = section.items || [];
            // A "feature" section is one picture and a few words; everything
            // else is a heading with product cards under it.
            const isFeature = (section.kind || "cards") === "feature";

            return (
              <div key={section.section_key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="font-semibold text-gray-900 text-sm">{section.label || section.section_key}</h3>
                </div>

                <div className="grid gap-6 p-5 xl:grid-cols-12">
                  {/* A band has no cards, so the space goes to a proper preview
                      of what the website will show. */}
                  {isFeature && (
                    <div className="hidden xl:col-span-5 xl:order-1 xl:block">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Preview</p>
                        <div className="mt-3 overflow-hidden rounded-xl bg-white">
                          <Thumb
                            sources={draft.image ? [resolveImage(draft.image)] : []}
                            className="h-56 w-full"
                            iconSize={26}
                          />
                        </div>
                        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                          {draft.eyebrow || " "}
                        </p>
                        <div className="mt-1"><TitlePreview title={draft.title} /></div>
                        {draft.intro && (
                          <p className="mt-2 text-xs leading-5 text-gray-500">{draft.intro}</p>
                        )}
                        {draft.cta_label && (
                          <span className="mt-4 inline-block rounded-full bg-[#D5AD4D] px-4 py-2 text-xs font-bold text-[#1B1406]">
                            {draft.cta_label}
                          </span>
                        )}
                        {draft.cta_link && (
                          <p className="mt-2 text-[11px] text-gray-400 break-all">
                            Button opens: {/^(https?:|mailto:|tel:|\/)/i.test(String(draft.cta_link).trim())
                              ? draft.cta_link
                              : `wa.me/${String(draft.cta_link).replace(/[^\d]/g, "")}`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Wording */}
                  <div className={`space-y-4 ${isFeature ? "xl:col-span-7 xl:order-2" : "xl:col-span-4"}`}>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-4 xl:hidden">
                      {isFeature && (
                        <Thumb
                          sources={draft.image ? [resolveImage(draft.image)] : []}
                          className="mb-3 h-40 w-full rounded-lg"
                          iconSize={22}
                        />
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{draft.eyebrow || " "}</p>
                      <div className="mt-1.5"><TitlePreview title={draft.title} /></div>
                      {draft.intro && <p className="mt-2 text-xs text-gray-500">{draft.intro}</p>}
                      {isFeature && draft.cta_label && (
                        <span className="mt-3 inline-block rounded-full bg-[#D5AD4D] px-3 py-1.5 text-[11px] font-bold text-[#1B1406]">
                          {draft.cta_label}
                        </span>
                      )}
                    </div>

                    <Field label="Small label above the heading" value={draft.eyebrow || ""} maxLength={120}
                      onChange={(v) => edit(section.section_key, "eyebrow", v)} />
                    <Field label="Heading"
                      hint="Type | where the line should break, and put *stars* around a word to set it in italic."
                      value={draft.title || ""} maxLength={255}
                      onChange={(v) => edit(section.section_key, "title", v)} />
                    <Field label="Short paragraph" textarea value={draft.intro || ""} maxLength={2000}
                      onChange={(v) => edit(section.section_key, "intro", v)} />
                    {isFeature && (
                      <ImageField
                        label="Picture"
                        hint="Upload one, or give the address of a file already on the website."
                        value={draft.image}
                        onChange={(v) => edit(section.section_key, "image", v)}
                        api={api}
                        nameSeed={section.section_key}
                      />
                    )}

                    <Field label="Button text" value={draft.cta_label || ""} maxLength={120}
                      onChange={(v) => edit(section.section_key, "cta_label", v)} />

                    {isFeature && (
                      <Field label="WhatsApp number for the button"
                        placeholder="919051626156"
                        hint="With the country code and no spaces. The button opens a chat with the heading as the first line. A full web address works here too."
                        value={draft.cta_link || ""} maxLength={255}
                        onChange={(v) => edit(section.section_key, "cta_link", v)} />
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveSection(section.section_key)}
                        disabled={saving || !dirty}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1B1406] bg-[#D5AD4D] hover:bg-[#C1913C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? "Saving…" : "Save heading"}
                      </button>
                      {dirty && !saving && <span className="text-xs text-gray-400">Unsaved changes</span>}
                    </div>
                  </div>

                  {/* Cards — only for sections that have them. */}
                  {!isFeature && (
                  <div className="xl:col-span-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Product cards</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {items.length} card{items.length === 1 ? "" : "s"}, shown on the website in this order.
                          Hover a card to edit, reorder or remove it.
                        </p>
                      </div>
                      <button
                        onClick={() => setEditing({ sectionKey: section.section_key, card: { ...BLANK_CARD } })}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#1B1406] bg-[#D5AD4D] hover:bg-[#C1913C] transition-colors shrink-0"
                      >
                        <FiPlus size={15} /> Add card
                      </button>
                    </div>

                    {!items.length ? (
                      <p className="text-xs text-gray-400 py-12 text-center border border-dashed border-gray-200 rounded-xl mt-4">
                        No cards yet. Use “Add card” to put a product here.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {items.map((card, i) => (
                          <CardTile
                            key={card.id}
                            card={card}
                            products={products}
                            index={i}
                            count={items.length}
                            onEdit={(c) => setEditing({ sectionKey: section.section_key, card: c })}
                            onDelete={deleteCard}
                            onMove={(id, dir) => moveCard(section.section_key, id, dir)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CardDialog
        open={!!editing}
        card={editing?.card}
        products={products}
        saving={savingCard}
        api={api}
        onClose={() => setEditing(null)}
        onSave={saveCard}
      />
    </AdminLayout>
  );
}
