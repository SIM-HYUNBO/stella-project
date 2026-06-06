import os

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

REPLACEMENTS = [
    # ── 전송 버튼 border 추가 ─────────────────────────────
    ('bg-sky-100 text-sky-800 flex items-center justify-center shadow-md disabled:opacity-50',
     'bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center disabled:opacity-50'),
    ('bg-sky-100 text-sky-800 flex items-center justify-center shadow-md shrink-0 disabled:opacity-50',
     'bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0 disabled:opacity-50'),
    ('bg-sky-100 text-sky-800 shadow-sm hover:scale-105 active:scale-95 transition shrink-0',
     'bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-50 active:scale-95 transition shrink-0'),
    # ── 스피너 색상 (sky-100 bg 안에서 border-white는 안 보임) ──
    ('border-2 border-white border-t-transparent rounded-full animate-spin',
     'border-2 border-sky-600 border-t-transparent rounded-full animate-spin'),
    # ── 아바타 원형 대비 개선 ─────────────────────────────
    ('bg-sky-100 text-sky-800 font-bold flex items-center justify-center shadow',
     'bg-sky-100 text-sky-900 font-bold flex items-center justify-center shadow'),
    ('bg-sky-100 font-bold flex items-center justify-center shadow',
     'bg-sky-100 text-sky-900 font-bold flex items-center justify-center shadow'),
    # ── 활성 사용자 아이템 border 추가 ──────────────────────
    ('bg-sky-100" : "hover:bg-gray-50"',
     'bg-sky-50 border border-sky-200" : "hover:bg-gray-50 border border-gray-300"'),

    # ── home 페이지 동적 color 배열 ────────────────────────
    # from-X to-Y 값들이 ${color} 형태로 쓰이므로 bg-X 단독으로 변경
    ('"bg-sky-100"', '"bg-sky-100"'),  # already correct, skip
    # 여전히 남아있을 수 있는 from-* 패턴
    ('color: "from-sky-500 to-red-400"', 'color: "bg-sky-100"'),
    ('color: "from-cyan-400 to-sky-500"', 'color: "bg-sky-100"'),
    ('color: "from-pink-400 to-rose-500"', 'color: "bg-pink-100"'),
    # grad 변수
    ('grad: "from-red-400 via-sky-500 to-blue-400"', 'grad: "bg-sky-100"'),
    ('grad: "from-cyan-400 to-sky-500"', 'grad: "bg-sky-100"'),
    ('grad: "from-pink-400 to-rose-500"', 'grad: "bg-pink-100"'),
    ('grad: "from-violet-400 to-purple-500"', 'grad: "bg-violet-100"'),
    # fri 페이지 color 변수
    ('color: "from-red-400 to-rose-400"', 'color: "bg-red-100"'),
    ('color: "from-slate-400 to-gray-500"', 'color: "bg-gray-200"'),
    ('color: "from-violet-400 to-purple-500"', 'color: "bg-violet-100"'),
    ('color: "from-sky-400 to-sky-500"', 'color: "bg-sky-100"'),
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
