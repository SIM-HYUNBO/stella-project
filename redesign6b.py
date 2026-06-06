import os
import re

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

REPLACEMENTS = [
    # ── Header 배경 그라디언트 ─────────────────────────────────
    ('absolute inset-0 bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-200',
     'absolute inset-0 bg-yellow-50'),

    # ── Login/Signup WAGIE 타이틀 ─────────────────────────────
    ('text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-amber-400',
     'text-sky-400'),
    ('absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400',
     'absolute inset-0 bg-sky-100'),

    # ── AppLock / tools 로딩 배경 ─────────────────────────────
    ('bg-gradient-to-b from-orange-50 to-amber-50', 'bg-yellow-50'),

    # ── 아이콘 박스 오렌지 → 하늘/노랑 ──────────────────────
    ('bg-gradient-to-br from-orange-200 to-amber-200', 'bg-sky-100'),
    ('bg-gradient-to-br from-orange-200 to-amber-100', 'bg-yellow-100'),
    ('bg-gradient-to-br from-orange-100 to-amber-100 scale-110 ring-2 ring-orange-300',
     'bg-sky-100 scale-110 ring-2 ring-sky-200'),
    ('bg-gradient-to-br from-orange-100 to-amber-50', 'bg-yellow-50'),
    ('bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-200', 'bg-yellow-100'),

    # ── 메시지 버블 오렌지 → 하늘 ────────────────────────────
    ('"bg-gradient-to-r from-orange-200 to-amber-100 border-sky-200"',
     '"bg-sky-100"'),
    ('bg-gradient-to-r from-orange-200 to-amber-100 border-sky-200',
     'bg-sky-100'),

    # ── friendmenu 프로필 배경 ────────────────────────────────
    ('w-full h-full bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-200',
     'w-full h-full bg-yellow-100'),

    # ── home 아이콘 box ───────────────────────────────────────
    ('w-12 h-12 rounded-xl bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-2xl shadow',
     'w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-2xl'),

    # ── profile 아바타 배경 ───────────────────────────────────
    ('relative w-24 h-24 rounded-[22px] bg-gradient-to-br from-orange-200 to-amber-200 overflow-hidden ring-4 ring-white cursor-pointer shrink-0',
     'relative w-24 h-24 rounded-[22px] bg-sky-100 overflow-hidden ring-4 ring-white cursor-pointer shrink-0'),

    # ── diary 무드 그라디언트 변수 ────────────────────────────
    ('"from-amber-200 to-yellow-100"', '"bg-yellow-100"'),
    ('"from-pink-200 to-sky-100"', '"bg-sky-100"'),
    ('"from-orange-200 to-amber-100"', '"bg-yellow-100"'),
    ('"from-yellow-200 to-lime-100"', '"bg-yellow-100"'),
    # diary gradient bg 사용
    ('bg-gradient-to-br ${moodBg[todayEntry.mood] || "from-orange-100 to-amber-50"}',
     'bg-yellow-50'),
    ('bg-gradient-to-br ${moodBg[entry.mood] || "from-orange-100 to-amber-50"}',
     'bg-yellow-50'),
    ('bg-gradient-to-br ${moodBg[entry.mood] || "from-orange-100 to-amber-50"}',
     'bg-yellow-50'),
    ('w-8 h-8 rounded-full bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-sm font-black text-sky-500 shadow',
     'w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sm font-black text-sky-500'),

    # ── titles 색 변수 ────────────────────────────────────────
    ('"from-orange-400 via-pink-400 to-sky-300"', '"bg-sky-100"'),

    # ── home color 변수 ───────────────────────────────────────
    ('"from-orange-400 to-red-400"', '"bg-sky-100"'),

    # ── 남은 그라디언트 클리어 ───────────────────────────────
    ('from-orange-400 to-amber-300', ''),
    ('from-orange-300 to-amber-300', ''),
    ('from-orange-200 to-amber-200', ''),
    ('from-orange-100 to-amber-100', ''),
    ('from-orange-100 to-amber-50', ''),
    ('from-amber-200 to-yellow-100', ''),
    ('from-pink-200 to-sky-100', ''),
    ('from-yellow-200 to-lime-100', ''),
    ('bg-gradient-to-br ', 'bg-'),
    ('bg-gradient-to-r ', 'bg-'),
    ('bg-gradient-to-b ', 'bg-'),
    ('bg-gradient-to-t ', 'bg-'),

    # ── 남은 테두리 ──────────────────────────────────────────
    (' ring-2 ring-orange-300', ''),
    (' ring-2 ring-sky-200', ''),
    (' ring-4 ring-white', ''),
]

SHADOW_PATTERN = re.compile(r" ?shadow-\[[^\]]+\]")

def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    out = src
    for old, new in REPLACEMENTS:
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
