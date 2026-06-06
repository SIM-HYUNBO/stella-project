import os

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

# bg-sky-100 위에 text-white는 대비가 없으므로 text-sky-800로 교체
# 그리고 구체적인 패턴들 수정
REPLACEMENTS = [
    # ── text-white on sky-100 backgrounds ──────────────────
    ('bg-sky-100 text-white', 'bg-sky-100 text-sky-800'),
    ('text-white bg-sky-100', 'text-sky-800 bg-sky-100'),
    # 아바타 기본 원형 (bg-sky-100 ... text-white)
    ('bg-sky-100 flex items-center justify-center text-sm font-bold text-white shadow',
     'bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-800 shadow'),
    ('bg-sky-100 flex items-center justify-center text-xs font-bold text-white shadow',
     'bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-800 shadow'),
    ('bg-sky-100 text-white font-bold flex items-center justify-center shadow',
     'bg-sky-100 text-sky-800 font-bold flex items-center justify-center shadow'),
    # 전송 버튼 → 흰색 배경 + 테두리 스타일
    ('bg-sky-100 text-white shadow-md disabled:opacity-50',
     'bg-sky-100 text-sky-700 border border-sky-200 disabled:opacity-50'),
    ('bg-sky-100 text-white flex items-center justify-center shadow-md disabled:opacity-50',
     'bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center disabled:opacity-50'),
    ('bg-sky-100 text-white shadow-[0_4px_14px_rgba(14,165,233,0.35)] hover:scale-105 active:scale-95 transition shrink-0',
     'bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-50 active:scale-95 transition shrink-0'),
    # 채팅 메시지 말풍선 내 text-white → sky-900
    ('"bg-sky-100 text-white rounded-br-md"',
     '"bg-sky-100 text-sky-900 border border-sky-200 rounded-br-md"'),
    # 리스트 active item
    ('bg-sky-100" : "hover:bg-gray-50"',
     'bg-sky-100" : "hover:bg-gray-50"'),

    # ── 입력창/검색창 테두리 제거 ────────────────────────
    # 일반 텍스트 입력창
    ('rounded-[16px] bg-gray-50 border border-gray-300 px-4 text-sm outline-none',
     'rounded-[16px] bg-gray-50 px-4 text-sm outline-none'),
    ('rounded-[16px] bg-white border border-gray-300 px-4 text-sm outline-none',
     'rounded-[16px] bg-gray-50 px-4 text-sm outline-none'),
    ('rounded-2xl border bg-gray-50 text-sm',
     'rounded-2xl bg-gray-50 text-sm'),
    ('rounded-2xl bg-gray-50 border border-gray-300 text-sm',
     'rounded-2xl bg-gray-50 text-sm'),
    # 검색창
    ('rounded-[16px] bg-white border border-gray-300 px-4',
     'rounded-[16px] bg-gray-50 px-4'),
    # 기타 input border
    ('bg-sky-50 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200',
     'bg-gray-50 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200'),

    # ── bg-clip-text bg-sky-100 → text-sky-400 ───────────
    ('bg-sky-100 bg-clip-text text-transparent', 'text-sky-400'),
    ('text-transparent bg-clip-text bg-sky-100', 'text-sky-400'),

    # ── from-*, to-* color 변수값 정리 ──────────────────
    ('"from-sky-500 to-red-400"', '"bg-sky-100"'),
    ('"from-cyan-400 to-sky-500"', '"bg-sky-100"'),
    ('"from-pink-400 to-rose-500"', '"bg-pink-100"'),
    ('"from-red-400 via-sky-500 to-blue-400"', '"bg-sky-100"'),
    ('"from-cyan-400 to-sky-500"', '"bg-sky-100"'),
    ('"from-pink-400 to-rose-500"', '"bg-pink-100"'),
    ('"from-violet-400 to-purple-500"', '"bg-violet-100"'),
    ('"from-red-400 to-rose-400"', '"bg-red-100"'),
    ('"from-slate-400 to-gray-500"', '"bg-gray-100"'),
    ('"from-sky-400 to-sky-500"', '"bg-sky-100"'),
    ('"from-sky-500 to-blue-400"', '"bg-sky-100"'),
    ('"from-sky-400 to-blue-400"', '"bg-sky-100"'),
    ('"from-pink-300 to-rose-300"', '"bg-pink-100"'),

    # ── active item 배경 (sky-100 → gray-50) ─────────────
    ('? "bg-sky-100" : "hover:bg-gray-50"',
     '? "bg-sky-50" : "hover:bg-gray-50"'),
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
