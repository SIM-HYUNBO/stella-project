import os, re

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js', '.css')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

REPLACEMENTS = [
    # ── 배경 ─────────────────────────────────────────────────────
    ('background: #fefce8', 'background: #f0f9ff'),  # sky-50 — 더 산뜻
    ('color: #1e293b', 'color: #0f172a'),

    # ── 네비 — 구분선 + 그림자 복구 ─────────────────────────────
    ('bg-white flex items-center justify-around px-2 h-12',
     'bg-white/95 backdrop-blur-sm border-t border-sky-100 flex items-center justify-around px-2 h-12 shadow-[0_-2px_16px_rgba(14,165,233,0.08)]'),

    # ── 헤더 배경 ────────────────────────────────────────────────
    ('absolute inset-0 bg-yellow-50',
     'absolute inset-0 bg-white'),

    # ── 메인 버튼 — 하늘 그라디언트 복구 ────────────────────────
    # 전송 버튼
    ('w-11 h-11 rounded-[14px] bg-sky-100 text-sky-700',
     'w-11 h-11 rounded-[14px] bg-gradient-to-br from-sky-400 to-cyan-300 text-white'),
    ('w-10 h-10 rounded-[12px] bg-sky-100 flex items-center justify-center',
     'w-10 h-10 rounded-[12px] bg-gradient-to-br from-sky-400 to-cyan-300 text-white flex items-center justify-center'),

    # ── 말풍선 내 것 — 하늘 그라디언트 ─────────────────────────
    ('bg-sky-200 text-sky-900 rounded-br-md',
     'bg-gradient-to-br from-sky-400 to-cyan-300 text-white rounded-br-md'),
    ('bg-sky-100 text-sky-800 rounded-br-md',
     'bg-gradient-to-br from-sky-400 to-cyan-300 text-white rounded-br-md'),
    # 말풍선 상대방 — 흰색 + 그림자
    ('bg-white text-gray-800 rounded-bl-md"',
     'bg-white shadow-sm text-gray-700 rounded-bl-md"'),
    ('bg-white border border-gray-100 rounded-bl-md',
     'bg-white shadow-sm text-gray-700 rounded-bl-md'),

    # ── 카드 — shadow-sm 기본 적용 ──────────────────────────────
    # 채팅방 리스트, 친구 리스트 등 bg-white 카드
    ('"rounded-2xl bg-white flex',     '"rounded-2xl bg-white shadow-sm flex'),
    ('"rounded-[20px] bg-white flex',  '"rounded-[20px] bg-white shadow-sm flex'),
    ('"rounded-[24px] bg-white flex',  '"rounded-[24px] bg-white shadow-sm flex'),
    ('"rounded-[28px] bg-white flex',  '"rounded-[28px] bg-white shadow-sm flex'),

    # ── 입력창 테두리 복구 ───────────────────────────────────────
    # h-11 rounded-[16px] bg-gray-50 / bg-white — 채팅 입력창
    ('h-11 rounded-[16px] bg-gray-50',
     'h-11 rounded-[16px] bg-white border border-sky-100'),
    ('h-11 rounded-[16px] bg-white px-4',
     'h-11 rounded-[16px] bg-white border border-sky-100 px-4'),
    ('rounded-2xl bg-white px-4 py-2',
     'rounded-2xl bg-white border border-gray-200 px-4 py-2'),
    ('rounded-2xl bg-gray-50 px-4',
     'rounded-2xl bg-white border border-gray-200 px-4'),
    ('rounded-full bg-yellow-50 px-4',
     'rounded-full bg-white border border-gray-200 px-4'),
    ('rounded-full bg-white px-4',
     'rounded-full bg-white border border-gray-200 px-4'),
    ('rounded-2xl border bg-gray-50 text-sm',
     'rounded-2xl bg-white border border-gray-200 text-sm'),

    # ── 랜딩 배경 오브 — 색감 살리기 ────────────────────────────
    ('bg-sky-200/30', 'bg-sky-300/20'),
    ('bg-sky-200/20', 'bg-sky-200/25'),
    ('bg-yellow-200/20', 'bg-yellow-300/20'),

    # ── 랜딩 WAGIE 타이틀 ────────────────────────────────────────
    ('text-sky-400', 'text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-cyan-400'),

    # ── LIVE 뱃지 ────────────────────────────────────────────────
    ('mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-sky-100',
     'mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_4px_16px_rgba(14,165,233,0.3)]'),
    # LIVE 텍스트 색
    ('text-sky-700 text-xs font-black tracking-widest',
     'text-white text-xs font-black tracking-widest'),

    # ── 로그인 / 가입 버튼 ───────────────────────────────────────
    ('h-16 rounded-[24px] bg-sky-100  active:scale-[0.98]',
     'h-16 rounded-[24px] bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_6px_20px_rgba(14,165,233,0.3)] active:scale-[0.98]'),
    ('text-sky-800 text-xl font-black tracking-wide',
     'text-white text-xl font-black tracking-wide'),

    # ── WHY WAGIE 배너 ────────────────────────────────────────────
    ('bg-sky-50 px-6 py-7',
     'bg-gradient-to-br from-sky-400 to-cyan-300 px-6 py-7'),
    # WHY WAGIE 안 텍스트 색
    ('text-gray-400 text-[10px] font-black tracking-[0.2em] mb-2',
     'text-white/70 text-[10px] font-black tracking-[0.2em] mb-2'),
    ('text-gray-800 font-black text-2xl leading-snug',
     'text-white font-black text-2xl leading-snug'),
    ('text-gray-500 text-sm mt-3 leading-relaxed',
     'text-white/80 text-sm mt-3 leading-relaxed'),

    # ── 스탯 칩 ──────────────────────────────────────────────────
    ('rounded-[20px] bg-white/75 backdrop-blur-sm',
     'rounded-[20px] bg-white shadow-sm'),

    # ── 기능카드 배경 ──────────────────────────────────────────
    ('rounded-[24px] bg-sky-100 px-5 py-5',
     'rounded-[24px] bg-white shadow-sm px-5 py-5'),
    ('rounded-[24px] bg-yellow-100 px-5 py-5',
     'rounded-[24px] bg-white shadow-sm px-5 py-5'),

    # ── tools/login 앱 잠금 배경 ─────────────────────────────────
    ('bg-yellow-50', 'bg-sky-50'),

    # ── active 네비 색상 ─────────────────────────────────────────
    # 이미 text-sky-400이지만 살짝 진하게
    ('text-sky-400"', 'text-sky-500"'),
]

SHADOW_CLEANUP = re.compile(r'shadow-sm shadow-sm')

def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    out = src
    for old, new in REPLACEMENTS:
        out = out.replace(old, new)
    out = SHADOW_CLEANUP.sub('shadow-sm', out)
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
