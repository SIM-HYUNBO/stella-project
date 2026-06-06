import os
import re

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js', '.css')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

# ── 1. 그라디언트 완전 제거 ────────────────────────────────────────
# 배경 그라디언트 → 단색
GRADIENT_REPLACEMENTS = [
    # 랜딩 배경
    ('bg-gradient-to-br from-yellow-50 via-sky-50 to-white', 'bg-yellow-50'),
    # 아이콘 박스
    ('bg-gradient-to-br from-sky-400 via-cyan-300 to-sky-200 shadow-[0_0_0_6px_rgba(56,189,248,0.25),0_20px_60px_rgba(56,189,248,0.45)]', 'bg-sky-100'),
    ('bg-gradient-to-br from-sky-400 via-cyan-300 to-sky-200', 'bg-sky-100'),
    # WHY WAGIE 배너
    ('bg-gradient-to-br from-sky-400 via-cyan-300 to-yellow-200 px-6 py-7', 'bg-sky-50 px-6 py-7'),
    # WAGIE 타이틀 텍스트 그라디언트
    ('text-transparent bg-clip-text bg-gradient-to-br from-sky-500 via-sky-400 to-cyan-300 drop-shadow-sm', 'text-sky-400'),
    ('text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300', 'text-sky-400'),
    # LIVE 뱃지
    ('bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_6px_20px_rgba(56,189,248,0.35)]', 'bg-sky-100'),
    ('bg-gradient-to-r from-sky-400 to-cyan-300', 'bg-sky-100'),
    # 버튼 그라디언트
    ('absolute inset-0 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300', 'absolute inset-0 bg-sky-100'),
    ('absolute inset-0 bg-gradient-to-r from-sky-50 to-cyan-50', ''),
    # 말풍선 내 말
    ('from-sky-400 to-cyan-300 text-white rounded-br-md', 'bg-sky-100 text-sky-800 rounded-br-md'),
    ('from-sky-300 to-cyan-200 text-white', 'bg-sky-100 text-sky-800'),
    # 로그인 버튼 오버레이
    ('absolute inset-0 bg-gradient-to-r from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition', ''),
    # 채팅 미리보기 말풍선
    ('"bg-gradient-to-r from-sky-400 to-cyan-300 text-white"', '"bg-sky-100 text-sky-800"'),
    # 동적 color 변수 (from-sky-400 to-cyan-300)
    ('"from-sky-400 to-cyan-300"', '"bg-sky-100"'),
    ('"from-sky-300 to-cyan-200"', '"bg-yellow-100"'),
    ('"from-pink-400 to-rose-300"', '"bg-yellow-100"'),
    ('"from-violet-400 to-purple-300"', '"bg-sky-100"'),
    # 나머지 from-/to- 포함 gradient
    ('from-sky-400 to-cyan-300', ''),
    ('from-sky-300 to-cyan-200', ''),
    ('from-yellow-50 via-sky-50 to-white', ''),
]

# ── 2. 테두리 전부 제거 ───────────────────────────────────────────
BORDER_REPLACEMENTS = [
    (' border border-sky-200', ''), (' border border-sky-100', ''),
    (' border border-sky-50', ''),  (' border border-yellow-200', ''),
    (' border border-yellow-100', ''), (' border border-gray-300', ''),
    (' border border-gray-200', ''), (' border border-gray-100', ''),
    (' border border-gray-50', ''),  (' border border-white', ''),
    (' border border-white/60', ''), (' border border-sky-300', ''),
    ('border border-sky-200 ', ''),  ('border border-sky-100 ', ''),
    ('border border-gray-100 ', ''), ('border border-gray-200 ', ''),
    (' border-t border-sky-100', ''), (' border-t border-gray-100', ''),
    (' border-t border-gray-200', ''), (' border-b border-gray-100', ''),
    (' border-b border-gray-200', ''), (' border-b border-sky-100', ''),
    (' border-2 border-sky-200', ''), (' border-2 border-sky-300', ''),
    (' border-2 border-gray-200', ''), (' border-2 border-gray-300', ''),
    ('border-violet-100 ', ''), ('border-violet-200 ', ''),
    (' border-violet-100', ''), (' border-violet-200', ''),
    ('border-pink-100 ', ''), ('border-pink-200 ', ''),
    (' border-l-4 border-sky-400', ''), (' border-l-4 border-blue-400', ''),
    (' ring-1 ring-sky-200', ''), (' ring-2 ring-sky-200', ''),
    # nav 테두리
    ('border-t border-sky-100 ', ''),
    ('bg-white border-t border-sky-100', 'bg-white'),
]

# ── 3. 그림자 전부 제거 ───────────────────────────────────────────
SHADOW_REPLACEMENTS = [
    (' shadow-2xl', ''), (' shadow-xl', ''), (' shadow-lg', ''),
    (' shadow-md', ''), (' shadow-sm', ''), (' shadow-inner', ''),
    ('shadow-2xl ', ''), ('shadow-xl ', ''), ('shadow-lg ', ''),
    ('shadow-md ', ''), ('shadow-sm ', ''), ('shadow-inner ', ''),
    ('shadow-[0_6px_20px_rgba(56,189,248,0.35)] ', ''),
    ('shadow-[0_4px_16px_rgba(255,150,80,0.1)] ', ''),
    ('shadow-[0_-4px_20px_rgba(0,0,0,0.06)]', ''),
]
SHADOW_PATTERN = re.compile(r" ?shadow-\[[^\]]+\]")

# ── 4. 다른 색 → 연노랑/연하늘 ───────────────────────────────────
COLOR_REPLACEMENTS = [
    # pink → yellow
    ('bg-pink-50', 'bg-yellow-50'),   ('bg-pink-100', 'bg-yellow-100'),
    ('bg-pink-200', 'bg-yellow-100'), ('bg-pink-300', 'bg-yellow-100'),
    ('bg-pink-400', 'bg-yellow-200'),
    ('text-pink-100', 'text-yellow-100'), ('text-pink-200', 'text-yellow-200'),
    ('text-pink-300', 'text-sky-300'),  ('text-pink-400', 'text-sky-400'),
    ('text-pink-500', 'text-sky-500'),  ('text-pink-600', 'text-sky-600'),
    ('text-pink-700', 'text-sky-600'),  ('text-pink-800', 'text-sky-700'),
    ('text-pink-900', 'text-sky-800'),
    ('from-pink-300', 'from-sky-200'), ('from-pink-400', 'from-sky-300'),
    ('to-pink-100', 'to-yellow-100'),  ('to-pink-100', 'to-sky-100'),
    ('to-pink-300', 'to-sky-200'),     ('to-pink-400', 'to-sky-300'),
    ('to-pink-500', 'to-sky-400'),
    ('hover:bg-pink-100', 'hover:bg-yellow-100'),
    ('hover:bg-pink-50', 'hover:bg-yellow-50'),
    ('border-pink-100', ''), ('border-pink-200', ''),

    # rose → sky
    ('bg-rose-50', 'bg-sky-50'),   ('bg-rose-100', 'bg-sky-100'),
    ('bg-rose-200', 'bg-sky-100'), ('bg-rose-300', 'bg-sky-100'),
    ('text-rose-400', 'text-sky-400'), ('text-rose-500', 'text-sky-500'),
    ('text-rose-600', 'text-sky-600'),
    ('to-rose-100', 'to-sky-100'), ('to-rose-200', 'to-sky-200'),
    ('to-rose-300', 'to-sky-200'), ('to-rose-400', 'to-sky-300'),
    ('to-rose-500', 'to-sky-400'),

    # violet → sky
    ('bg-violet-50', 'bg-sky-50'),   ('bg-violet-100', 'bg-sky-100'),
    ('bg-violet-200', 'bg-sky-100'), ('bg-violet-300', 'bg-sky-100'),
    ('bg-violet-400', 'bg-sky-200'),
    ('text-violet-300', 'text-sky-300'), ('text-violet-400', 'text-sky-400'),
    ('text-violet-500', 'text-sky-500'), ('text-violet-600', 'text-sky-600'),
    ('text-violet-700', 'text-sky-700'), ('text-violet-800', 'text-sky-800'),
    ('text-violet-900', 'text-sky-800'),
    ('from-violet-50', 'from-sky-50'),   ('from-violet-200', 'from-sky-200'),
    ('from-violet-300', 'from-sky-300'), ('from-violet-400', 'from-sky-400'),
    ('from-violet-500', 'from-sky-500'),
    ('to-violet-100', 'to-sky-100'), ('to-violet-400', 'to-sky-300'),
    ('hover:bg-violet-50', 'hover:bg-sky-50'),
    ('hover:bg-violet-100', 'hover:bg-sky-100'),
    ('border-violet-100', ''), ('border-violet-200', ''),

    # purple → sky
    ('bg-purple-50', 'bg-sky-50'),  ('bg-purple-100', 'bg-sky-100'),
    ('bg-purple-200', 'bg-sky-100'), ('bg-purple-400', 'bg-sky-200'),
    ('text-purple-400', 'text-sky-400'), ('text-purple-500', 'text-sky-500'),
    ('text-purple-600', 'text-sky-600'), ('text-purple-700', 'text-sky-700'),

    # indigo/blue → sky
    ('bg-blue-50', 'bg-sky-50'),   ('bg-blue-100', 'bg-sky-100'),
    ('bg-indigo-50', 'bg-sky-50'), ('bg-indigo-100', 'bg-sky-100'),
    ('text-blue-500', 'text-sky-500'), ('text-blue-600', 'text-sky-600'),
    ('text-indigo-500', 'text-sky-500'),
    ('bg-blue-50 border-t', 'bg-yellow-50'),

    # amber/orange 잔여 → yellow/sky
    ('bg-amber-50', 'bg-yellow-50'),   ('bg-amber-100', 'bg-yellow-100'),
    ('bg-amber-200', 'bg-yellow-100'),
    ('text-amber-400', 'text-sky-400'), ('text-amber-500', 'text-sky-500'),
    ('text-amber-600', 'text-sky-600'), ('text-amber-700', 'text-sky-700'),
    ('bg-orange-50', 'bg-yellow-50'),  ('bg-orange-100', 'bg-sky-100'),
    ('text-orange-400', 'text-sky-400'), ('text-orange-500', 'text-sky-500'),
    ('text-orange-600', 'text-sky-600'),

    # teal/emerald/green 장식용만 (online 표시 green은 유지)
    ('bg-teal-100', 'bg-sky-100'), ('text-teal-500', 'text-sky-500'),
    ('bg-emerald-100', 'bg-sky-100'),

    # globals.css
    ('background: transparent', 'background: #fefce8'),
    ('color: inherit', 'color: #1e293b'),
]

def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    out = src
    for old, new in GRADIENT_REPLACEMENTS + BORDER_REPLACEMENTS + SHADOW_REPLACEMENTS + COLOR_REPLACEMENTS:
        out = out.replace(old, new)
    out = SHADOW_PATTERN.sub('', out)
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
                p = os.path.join(root, f)
                if process(p):
                    changed.append(p)

print(f"Changed: {len(changed)}")
for p in changed:
    print(' ', p.replace(r'c:\Project\stella-project\\', ''))
