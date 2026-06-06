import os
import re

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js', '.css')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

# 순서 중요: 더 긴/구체적인 패턴 먼저
REPLACEMENTS = [

    # ── 배경 그라디언트 (랜딩 페이지) ─────────────────────────────
    ('bg-gradient-to-br from-[#fff6ee] via-[#fff0e0] to-[#fff8f0]',
     'bg-gradient-to-br from-yellow-50 via-sky-50 to-white'),
    ('bg-[#fff7ef]', 'bg-[#fefce8]'),

    # ── 배경 블롭 ──────────────────────────────────────────────────
    ('bg-orange-300/25', 'bg-sky-200/30'),
    ('bg-orange-300/15', 'bg-sky-200/20'),
    ('bg-amber-200/20', 'bg-yellow-200/20'),

    # ── 아이콘 박스 그라디언트 ──────────────────────────────────────
    ('bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 shadow-[0_0_0_6px_rgba(255,200,100,0.3),0_20px_60px_rgba(255,160,50,0.5)]',
     'bg-gradient-to-br from-sky-400 via-cyan-300 to-sky-200 shadow-[0_0_0_6px_rgba(56,189,248,0.25),0_20px_60px_rgba(56,189,248,0.45)]'),
    ('bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300',
     'bg-gradient-to-br from-sky-400 via-cyan-300 to-sky-200'),

    # ── WAGIE 타이틀 그라디언트 ────────────────────────────────────
    ('bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-400',
     'bg-gradient-to-br from-sky-500 via-sky-400 to-cyan-300'),
    ('bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400',
     'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300'),

    # ── LIVE 뱃지 / 버튼 그라디언트 ───────────────────────────────
    ('bg-gradient-to-r from-orange-400 to-amber-300 shadow-[0_6px_20px_rgba(255,160,50,0.4)]',
     'bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_6px_20px_rgba(56,189,248,0.35)]'),
    ('bg-gradient-to-r from-orange-400 to-amber-300',
     'bg-gradient-to-r from-sky-400 to-cyan-300'),
    ('from-orange-400 to-amber-300',
     'from-sky-400 to-cyan-300'),
    ('from-orange-400 to-amber-400',
     'from-sky-400 to-cyan-300'),
    ('from-orange-300 to-amber-300',
     'from-sky-300 to-cyan-200'),
    ('from-orange-300 to-yellow-300',
     'from-sky-300 to-cyan-200'),

    # ── 말풍선 내 말 ───────────────────────────────────────────────
    ('from-yellow-300 to-orange-300 text-white',
     'from-sky-400 to-cyan-300 text-white'),
    ('from-sky-300 to-yellow-300 text-white',
     'from-sky-400 to-cyan-300 text-white'),

    # ── 랜딩 채팅 미리보기 말풍선 ──────────────────────────────────
    ('"bg-white border border-orange-50 text-zinc-700"',
     '"bg-white border border-sky-100 text-gray-700"'),
    ('"bg-gradient-to-r from-sky-400 to-cyan-300 text-white"',
     '"bg-gradient-to-r from-sky-400 to-cyan-300 text-white"'),  # already converted

    # ── 로그인 버튼 그라디언트 ─────────────────────────────────────
    ('absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400',
     'absolute inset-0 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300'),
    ('absolute inset-0 bg-gradient-to-r from-orange-50 to-amber-50',
     'absolute inset-0 bg-gradient-to-r from-sky-50 to-cyan-50'),

    # ── WHY WAGIE 배너 ─────────────────────────────────────────────
    ('bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 px-6 py-7',
     'bg-gradient-to-br from-sky-400 via-cyan-300 to-yellow-200 px-6 py-7'),

    # ── 스탯 칩 그라디언트 아이콘 ──────────────────────────────────
    ('"from-orange-400 to-amber-300"', '"from-sky-400 to-cyan-300"'),

    # ── 링 테두리 ──────────────────────────────────────────────────
    ('border-orange-300/30', 'border-sky-300/30'),
    ('border-amber-300/40', 'border-sky-300/40'),
    ('border-orange-300', 'border-sky-300'),

    # ── nav 배경/테두리 ────────────────────────────────────────────
    ('bg-orange-50 border-t border-orange-100', 'bg-white border-t border-sky-100'),

    # ── bg 클래스 ──────────────────────────────────────────────────
    ('bg-orange-50', 'bg-yellow-50'),
    ('bg-orange-100', 'bg-sky-100'),
    ('bg-orange-200', 'bg-sky-200'),
    ('bg-amber-50', 'bg-yellow-50'),
    ('bg-amber-100', 'bg-yellow-100'),
    ('bg-amber-200', 'bg-yellow-200'),

    # ── hover ──────────────────────────────────────────────────────
    ('hover:bg-orange-100', 'hover:bg-sky-100'),
    ('hover:bg-orange-50', 'hover:bg-sky-50'),
    ('hover:bg-amber-100', 'hover:bg-yellow-100'),
    ('hover:bg-amber-50', 'hover:bg-yellow-50'),

    # ── border 클래스 ──────────────────────────────────────────────
    ('border-orange-100', 'border-sky-100'),
    ('border-orange-50', 'border-sky-50'),
    ('border-orange-200', 'border-sky-200'),
    ('border-amber-100', 'border-yellow-100'),
    ('border-amber-200', 'border-yellow-200'),

    # ── text 클래스 ────────────────────────────────────────────────
    ('text-orange-400"', 'text-sky-400"'),   # nav active (따옴표 포함)
    ('text-orange-400 ', 'text-sky-400 '),
    ('text-orange-500', 'text-sky-500'),
    ('text-orange-600', 'text-sky-600'),
    ('text-orange-700', 'text-sky-700'),
    ('text-orange-800', 'text-sky-800'),
    ('text-orange-900', 'text-sky-900'),
    ('text-amber-400', 'text-sky-400'),
    ('text-amber-500', 'text-sky-500'),
    ('text-amber-600', 'text-sky-600'),
    ('text-amber-700', 'text-sky-700'),

    # ── 헥스 컬러 → Tailwind ───────────────────────────────────────
    ('text-[#e07020]', 'text-sky-600'),
    ('text-[#e09040]', 'text-sky-500'),
    ('text-[#b07848]', 'text-sky-600'),
    ('text-[#c07030]', 'text-sky-700'),
    ('text-[#c09070]', 'text-sky-400'),
    ('text-[#3d1f00]', 'text-slate-800'),
    ('text-[#d4a07a]', 'text-slate-400'),
    ('[#3d1f00]', 'slate-800'),  # placeholder:text-[#3d1f00] 형태도 포함

    # ── placeholder 색 ─────────────────────────────────────────────
    ('placeholder:text-[#d4a07a]', 'placeholder:text-slate-400'),

    # ── 그림자 rgba ────────────────────────────────────────────────
    ('rgba(255,160,50,0.5)', 'rgba(56,189,248,0.4)'),
    ('rgba(255,160,50,0.45)', 'rgba(56,189,248,0.35)'),
    ('rgba(255,160,50,0.4)', 'rgba(56,189,248,0.35)'),
    ('rgba(255,160,50,0.35)', 'rgba(56,189,248,0.3)'),
    ('rgba(255,200,100,0.3)', 'rgba(56,189,248,0.25)'),
    ('rgba(255,150,80,0.15)', 'rgba(56,189,248,0.12)'),
    ('rgba(255,150,80,0.1)', 'rgba(56,189,248,0.08)'),
    ('rgba(255,100,50,0.15)', 'rgba(56,189,248,0.12)'),

    # ── globals.css body 배경 ──────────────────────────────────────
    ('background: transparent', 'background: #fefce8'),
    ('color: inherit', 'color: #1e293b'),
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
                p = os.path.join(root, f)
                if process(p):
                    changed.append(p)

print(f"Changed: {len(changed)}")
for p in changed:
    print(' ', p.replace(r'c:\Project\stella-project\\', ''))
