import { useAsyncData } from "@project/hooks";
import type { DocEntry } from "@project/types";
import { Badge, Card, Output, SearchInput } from "@project/ui";
import { BookOpen, FileText, Plus, RefreshCw, Tag, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { docs } from "../api";

const DEFAULT_CATEGORIES = ["Troubleshooting", "Setup", "Config", "Commands", "General"];

export function DocsPage() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<DocEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, _setOutput] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, list] = await Promise.all([
        docs.init(),
        docs.list({ category: selectedCategory || undefined, search: search || undefined }),
      ]);
      setCategories(cats.length > 0 ? cats : DEFAULT_CATEGORIES);
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useAsyncData(refresh);

  // Re-fetch when category or search changes
  const prevCategory = useRef(selectedCategory);
  const prevSearch = useRef(search);
  useEffect(() => {
    if (prevCategory.current !== selectedCategory || prevSearch.current !== search) {
      prevCategory.current = selectedCategory;
      prevSearch.current = search;
      refresh();
    }
  }, [selectedCategory, search, refresh]);

  const openDoc = (doc: DocEntry) => {
    setSelected(doc);
    setIsEditing(false);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditCategory(doc.category);
    setEditTags(doc.tags.join(", "));
  };

  const startNew = () => {
    setSelected(null);
    setIsEditing(true);
    setEditTitle("");
    setEditContent("");
    setEditCategory(selectedCategory || "General");
    setEditTags("");
    setShowNew(true);
  };

  const saveDoc = async () => {
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (selected && !showNew) {
      const updated = await docs.update(selected.id, {
        title: editTitle,
        content: editContent,
        category: editCategory,
        tags,
      });
      setSelected(updated);
      setIsEditing(false);
    } else {
      const created = await docs.create({
        title: editTitle,
        content: editContent,
        category: editCategory,
        tags,
      });
      setSelected(created);
      setShowNew(false);
      setIsEditing(false);
    }
    refresh();
  };

  const deleteDoc = async (id: string) => {
    await docs.delete(id);
    setSelected(null);
    setIsEditing(false);
    refresh();
  };

  const categoryCounts = categories.reduce(
    (acc, cat) => {
      acc[cat] = entries.filter((e) => e.category === cat).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const filteredEntries = search
    ? entries.filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.content.toLowerCase().includes(search.toLowerCase()) ||
          e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      )
    : entries;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <button onClick={refresh} className="btn-secondary flex items-center gap-1.5">
            <RefreshCw size={14} />
            Refresh
          </button>
          <button onClick={startNew} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} />
            New Doc
          </button>
        </div>
      </div>

      {output && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary animate-pulse">
          {output}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen size={18} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Docs</div>
            <div className="text-xl font-bold">{entries.length}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <FileText size={18} className="text-success-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Categories</div>
            <div className="text-xl font-bold">{categories.length}</div>
          </div>
        </Card>
        <Card className="col-span-2 flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
            <Tag size={18} className="text-info-foreground" />
          </div>
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search docs..." className="py-1.5 text-sm" />
          </div>
        </Card>
      </div>

      {(isEditing || showNew) && (
        <Card className="border-primary/30 space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-medium">{showNew ? "New Document" : "Edit Document"}</span>
            <button
              onClick={() => {
                setIsEditing(false);
                setShowNew(false);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-2">
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <textarea
              placeholder="Content (markdown supported)..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setShowNew(false);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={saveDoc} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card className="col-span-1 max-h-[500px] overflow-y-auto p-0">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Categories
          </div>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelected(null);
            }}
            className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors ${!selectedCategory ? "bg-muted text-foreground" : "hover:bg-muted/50 text-foreground"}`}
          >
            <span className="text-sm">All</span>
            <Badge variant="default">{entries.length}</Badge>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelected(null);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors ${selectedCategory === cat ? "bg-muted text-foreground" : "hover:bg-muted/50 text-foreground"}`}
            >
              <span className="text-sm">{cat}</span>
              <Badge variant="default">{categoryCounts[cat] || 0}</Badge>
            </button>
          ))}
        </Card>

        <Card className="col-span-1 max-h-[500px] overflow-y-auto p-0">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Documents ({filteredEntries.length})
          </div>
          {filteredEntries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {loading
                ? "Loading..."
                : entries.length === 0
                  ? "No documents yet. Create your first one!"
                  : "No matching documents."}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredEntries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => openDoc(e)}
                  className={`flex w-full items-start gap-2 px-4 py-3 text-left transition-colors ${selected?.id === e.id ? "bg-muted text-foreground" : "hover:bg-muted/50 text-foreground"}`}
                >
                  <FileText size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="primary" className="text-xs">
                        {e.category}
                      </Badge>
                      {e.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-xs text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {new Date(e.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="col-span-2">
          {selected ? (
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-semibold">{selected.title}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="primary">{selected.category}</Badge>
                    {selected.tags.map((t) => (
                      <Badge key={t} variant="default">
                        <Tag size={10} /> {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Created {new Date(selected.createdAt).toLocaleDateString()} · Updated{" "}
                    {new Date(selected.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteDoc(selected.id)}
                    className="btn-danger flex items-center gap-1.5 text-xs"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
              <Output maxHeight="max-h-[400px]">{selected.content}</Output>
            </Card>
          ) : (
            <Card className="flex h-64 items-center justify-center p-4">
              <div className="text-center">
                <BookOpen size={48} className="mx-auto mb-3 text-muted-foreground/30" />
                <div className="text-sm text-muted-foreground">Select a document to view its contents</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
