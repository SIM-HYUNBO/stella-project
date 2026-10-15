export default function SpoilerComposerNotice({ onCancel }: { onCancel: () => void }) {
  return <div className="mx-4 mb-1 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
    <span>🔒 다음 메시지는 눌러야 보이는 스포일러로 보내</span>
    <button type="button" aria-label="스포일러 모드 취소" onClick={onCancel} className="ml-2 px-2 py-1">✕</button>
  </div>;
}
