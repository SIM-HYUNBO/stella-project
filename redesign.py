import os

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

REPLACEMENTS = [
    # ── 그라디언트 완전 제거 ──────────────────────────────
    ('bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]', 'bg-white'),
    ('bg-gradient-to-br from-sky-500 to-blue-400', 'bg-sky-100'),
    ('bg-gradient-to-br from-sky-400 to-blue-400', 'bg-sky-100'),
    ('bg-gradient-to-br from-cyan-400 to-sky-500', 'bg-sky-100'),
    ('bg-gradient-to-br from-sky-400 to-sky-500', 'bg-sky-100'),
    ('bg-gradient-to-br from-sky-500 to-red-400', 'bg-sky-100'),
    ('bg-gradient-to-br from-red-400 to-rose-400', 'bg-red-100'),
    ('bg-gradient-to-br from-red-400 via-sky-500 to-blue-400', 'bg-sky-100'),
    ('bg-gradient-to-br from-pink-400 to-rose-500', 'bg-pink-100'),
    ('bg-gradient-to-br from-pink-300 to-rose-300', 'bg-pink-100'),
    ('bg-gradient-to-br from-violet-400 to-purple-500', 'bg-violet-100'),
    ('bg-gradient-to-br from-slate-400 to-gray-500', 'bg-gray-100'),
    ('bg-gradient-to-r from-sky-400 to-sky-600', 'bg-sky-100'),
    # 동적 그라디언트 prefix 제거
    ('bg-gradient-to-br ${color}', '${color}'),
    ('bg-gradient-to-br ${grad}', '${grad}'),
    # shimmer 효과 제거
    ('bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_4s_infinite]', ''),
    ('bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.2)_50%,transparent_60%)] animate-[shimmer_3s_infinite]', ''),
    ('bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)]', ''),

    # ── 스카이 200 이하로 낮추기 ──────────────────────────
    ('bg-sky-500', 'bg-sky-100'),
    ('bg-sky-400', 'bg-sky-100'),
    ('bg-sky-300', 'bg-sky-100'),
    # hover/active 스카이
    ('hover:bg-sky-100', 'hover:bg-sky-50'),
    ('active:bg-sky-50', 'active:bg-sky-50'),
    # text-sky 유지 (가독성)
    ('text-sky-500', 'text-sky-400'),
    # border-sky
    ('border-sky-500', 'border-sky-200'),
    ('border-sky-400', 'border-sky-200'),
    ('border-sky-300', 'border-sky-200'),
    # ring-sky
    ('ring-sky-500', 'ring-sky-200'),
    ('ring-sky-400', 'ring-sky-200'),
    ('ring-sky-300', 'ring-sky-200'),

    # ── 테두리: 진한 회색 (gray-100 → gray-300) ──────────
    ('border border-gray-100', 'border border-gray-300'),
    ('border-gray-100', 'border-gray-300'),

    # ── orange nav → white ────────────────────────────────
    ('bg-orange-50', 'bg-white'),
    ('border-orange-100', 'border-gray-100'),
    ('text-orange-400', 'text-sky-300'),

    # ── 복잡한 그림자 → 단순화 ───────────────────────────
    ('shadow-[0_6px_20px_rgba(14,165,233,0.4)]', 'shadow-sm'),
    ('shadow-[0_14px_50px_rgba(14,165,233,0.5)]', 'shadow-sm'),
    ('shadow-[0_20px_60px_rgba(14,165,233,0.4)]', 'shadow-sm'),
    ('shadow-[0_20px_60px_rgba(14,165,233,0.45)]', 'shadow-sm'),
    ('shadow-[0_12px_40px_rgba(14,165,233,0.15)]', 'shadow-sm'),
    ('shadow-[0_8px_30px_rgba(14,165,233,0.3)]', 'shadow-sm'),
    ('shadow-[0_6px_24px_rgba(14,165,233,0.15)]', 'shadow-sm'),
    ('shadow-[0_6px_24px_rgba(14,165,233,0.2)]', 'shadow-sm'),
    ('shadow-[0_10px_30px_rgba(14,165,233,0.35)]', 'shadow-sm'),
    ('shadow-[0_6px_20px_rgba(14,165,233,0.35)]', 'shadow-sm'),
    ('shadow-[0_4px_14px_rgba(14,165,233,0.35)]', 'shadow-sm'),
    ('shadow-[0_4px_16px_rgba(14,165,233,0.1)]', 'shadow-sm'),
    ('shadow-[0_12px_40px_rgba(255,100,60,0.3)]', 'shadow-sm'),
    ('shadow-[0_8px_30px_rgba(14,165,233,0.28)]', 'shadow-sm'),
    ('shadow-[0_6px_24px_rgba(239,68,68,0.12)]', 'shadow-sm'),
    ('shadow-[0_6px_24px_rgba(14,165,233,0.15)]', 'shadow-sm'),
    ('shadow-[0_0_0_6px_rgba(255,200,100,0.3),0_20px_60px_rgba(14,165,233,0.5)]', 'shadow-md'),
    ('shadow-[0_6px_24px_rgba(14,165,233,0.2)]', 'shadow-sm'),
]

def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    out = src
    for old, new in REPLACEMENTS:
        out = out.replace(old, new)
    if out != src:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(out)
        return True
    return False

changed = []
for d in dirs:
    for root, dirs_list, files in os.walk(d):
        dirs_list[:] = [x for x in dirs_list if x not in exclude]
        for f in files:
            if f.endswith(exts):
                if process(os.path.join(root, f)):
                    changed.append(os.path.join(root, f))

print(f"Changed: {len(changed)}")
for p in changed:
    print(' ', p.replace(r'c:\Project\stella-project\\', ''))
