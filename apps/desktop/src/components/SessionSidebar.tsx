import { ChevronDown, ChevronRight, FolderOpen, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ChatSession, ChatTopic } from "../lib/sessions";

interface Props {
  topics: ChatTopic[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  expandedTopics: Set<string>;
  onSelectSession: (id: string) => void;
  onCreateSession: (topicId: string) => void;
  onCreateTopic: () => void;
  onDeleteSession: (id: string) => void;
  onDeleteTopic: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  onRenameTopic: (id: string, name: string) => void;
  onToggleTopic: (id: string) => void;
}

export function SessionSidebar({
  topics,
  sessions,
  activeSessionId,
  expandedTopics,
  onSelectSession,
  onCreateSession,
  onCreateTopic,
  onDeleteSession,
  onDeleteTopic,
  onRenameSession,
  onRenameTopic,
  onToggleTopic,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingType, setEditingType] = useState<"session" | "topic">("session");

  const startEdit = (id: string, name: string, type: "session" | "topic") => {
    setEditingId(id);
    setEditValue(name);
    setEditingType(type);
  };

  const commitEdit = () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      return;
    }
    if (editingType === "session") onRenameSession(editingId, editValue.trim());
    else onRenameTopic(editingId, editValue.trim());
    setEditingId(null);
  };

  const sessionsForTopic = (topicId: string) =>
    sessions.filter((s) => s.topicId === topicId).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b p-2 space-y-2">
        <button
          onClick={() => onCreateSession("topic-default")}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-primary/10 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus size={13} />
          New chat
        </button>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground/60">Topics</span>
          <button
            onClick={onCreateTopic}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="New topic"
          >
            <FolderOpen size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {topics.map((topic) => {
          const isExpanded = expandedTopics.has(topic.id);
          const topicSessions = sessionsForTopic(topic.id);

          return (
            <div key={topic.id} className="mb-1">
              <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                <button onClick={() => onToggleTopic(topic.id)} className="flex-shrink-0 text-muted-foreground">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {editingId === topic.id ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                    className="flex-1 bg-transparent text-xs outline-none"
                  />
                ) : (
                  <span className="flex-1 truncate text-xs font-medium">{topic.name}</span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onCreateSession(topic.id)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    title="New chat"
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    onClick={() => startEdit(topic.id, topic.name, "topic")}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    title="Rename"
                  >
                    <Pencil size={10} />
                  </button>
                  {topic.id !== "topic-default" && (
                    <button
                      onClick={() => onDeleteTopic(topic.id)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      title="Delete topic"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="ml-4">
                  {topicSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-1.5 rounded-md px-2 py-1 cursor-pointer transition-colors ${
                        session.id === activeSessionId
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <MessageSquare size={11} className="flex-shrink-0" />
                      {editingId === session.id ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                          className="flex-1 bg-transparent text-xs outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 truncate text-xs">{session.name}</span>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(session.id, session.name, "session");
                          }}
                          className="rounded p-0.5 hover:text-foreground"
                          title="Rename"
                        >
                          <Pencil size={9} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="rounded p-0.5 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {topicSessions.length === 0 && (
                    <div className="px-2 py-1 text-[10px] text-foreground/30">No chats yet</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
