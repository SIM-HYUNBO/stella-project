export function aiRetryContext<T extends { id: string; role: string; content: string }>(messages: T[], id: string) {
  const index = messages.findIndex(message => message.id === id);
  if (index < 0 || !["ai", "assistant"].includes(messages[index].role)) return null;
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].role === "user") return { target: messages[index], prompt: messages[i], history: messages.slice(0, i + 1) };
  }
  return null;
}
