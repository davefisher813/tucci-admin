"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  type ServiceCategory,
} from "@/lib/data/category-actions";

const SWATCHES = [
  "#1E78A6", "#16A34A", "#F5C518", "#9333EA",
  "#DC2626", "#0891B2", "#EA580C", "#6B7280",
];

export default function CategoryManager({
  categories,
}: {
  categories: ServiceCategory[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(SWATCHES[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setErr(null);
    const res = await createServiceCategory({
      name: newName.trim(),
      color_hex: newColor,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setNewName("");
    setNewColor(SWATCHES[0]);
    setShowAdd(false);
    router.refresh();
  }

  function startEdit(c: ServiceCategory) {
    setEditId(c.id);
    setEditName(c.name);
    setEditColor(c.color_hex);
    setErr(null);
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setErr(null);
    const res = await updateServiceCategory({
      id,
      name: editName.trim(),
      color_hex: editColor,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setEditId(null);
    router.refresh();
  }

  async function toggleActive(c: ServiceCategory) {
    setErr(null);
    const res = await updateServiceCategory({
      id: c.id,
      is_active: !c.is_active,
    });
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  async function remove(c: ServiceCategory) {
    setErr(null);
    const res = await deleteServiceCategory(c.id);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-[2px] font-display text-[23px] font-extrabold tracking-[-.01em] text-text">
        Service Categories
      </div>
      <div className="mb-[18px] text-[12.5px] text-muted">
        Settings › Categories
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <div className="mb-[14px] flex items-center justify-between">
        <div className="font-display text-[12px] font-bold text-muted">
          {categories.length}{" "}
          {categories.length === 1 ? "Category" : "Categories"}
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-9 items-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white"
        >
          {showAdd ? "Close" : "Add Category"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[10px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            New Category
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Cage Rentals"
                className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setNewColor(s)}
                    className={`h-8 w-8 rounded-full border-2 ${
                      newColor === s ? "border-ink" : "border-transparent"
                    }`}
                    style={{ background: s }}
                    aria-label={s}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={add}
              disabled={busy || !newName.trim()}
              className="rounded-[10px] bg-accent py-[13px] font-display text-[14px] font-extrabold text-white disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add Category"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {categories.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            No Categories Yet. Add one above.
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="border-b border-line px-[14px] py-[12px] last:border-b-0"
            >
              {editId === c.id ? (
                <div className="flex flex-col gap-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-[9px] border border-line-2 px-[11px] py-[10px] text-[14px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    {SWATCHES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditColor(s)}
                        className={`h-7 w-7 rounded-full border-2 ${
                          editColor === s ? "border-ink" : "border-transparent"
                        }`}
                        style={{ background: s }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(c.id)}
                      disabled={busy}
                      className="rounded-[9px] bg-accent px-4 py-[9px] font-display text-[13px] font-extrabold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="rounded-[9px] border border-line-2 px-4 py-[9px] text-[13px] font-semibold text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span
                    className="h-[14px] w-[14px] flex-shrink-0 rounded-full border border-line-2"
                    style={{ background: c.color_hex ?? "#CFD6E0" }}
                  />
                  <span
                    className={`font-display text-[15px] font-bold ${
                      c.is_active ? "text-text" : "text-muted line-through"
                    }`}
                  >
                    {c.name}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="rounded-[7px] border border-line-2 px-[10px] py-[6px] text-[12px] font-semibold text-text"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(c)}
                      className="rounded-[7px] border border-line-2 px-[10px] py-[6px] text-[12px] font-semibold text-muted"
                    >
                      {c.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="rounded-[7px] border border-danger/40 px-[10px] py-[6px] text-[12px] font-semibold text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
