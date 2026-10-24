type Name = "chat" | "group" | "book" | "friend" | "meeting" | "help" | "share" | "arrow" | "sparkle";
const paths: Record<Name, React.ReactNode> = {
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-3 2V12a9 9 0 0 1 19-.5Z" />,
  group: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" /></>,
  book: <><path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15" /></>,
  friend: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  meeting: <><rect x="4" y="4" width="16" height="17" rx="3" /><path d="M9 3h6v4H9zM8 12h8m-8 4h5" /></>,
  help: <><path d="M3 14v-2a9 9 0 0 1 18 0v2m-3 5a6 6 0 0 1-6 3" /><rect x="2" y="12" width="4" height="7" rx="2" /><rect x="18" y="12" width="4" height="7" rx="2" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m9 10 6-4M9 14l6 4" /></>,
  arrow: <path d="m9 5 7 7-7 7" />,
  sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></>,
};
export default function AppIcon({ name, size = 22 }: { name: Name; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
