import os
import re

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

REPLACEMENTS = [
    # ── 그림자 전부 제거 ──────────────────────────────────
    (' shadow-2xl', ''),
    (' shadow-xl', ''),
    (' shadow-lg', ''),
    (' shadow-md', ''),
    (' shadow-sm', ''),
    (' shadow-inner', ''),
    (' shadow', ''),
    ('shadow-2xl ', ''),
    ('shadow-xl ', ''),
    ('shadow-lg ', ''),
    ('shadow-md ', ''),
    ('shadow-sm ', ''),
    ('shadow-inner ', ''),
    # shadow-[...] 커스텀 제거
    # (정규식으로는 어렵지만 남은 건 별도 처리)

    # ── 테두리(border) 전부 제거 ─────────────────────────
    # 전체 테두리 (border border-*)
    ('border border-gray-300', ''),
    ('border border-gray-200', ''),
    ('border border-gray-100', ''),
    ('border border-sky-200', ''),
    ('border border-sky-100', ''),
    ('border border-sky-300', ''),
    ('border border-yellow-200', ''),
    ('border border-yellow-100', ''),
    ('border border-pink-200', ''),
    ('border border-pink-100', ''),
    ('border border-violet-200', ''),
    ('border border-violet-100', ''),
    ('border border-red-200', ''),
    ('border border-red-100', ''),
    ('border border-amber-100', ''),
    ('border border-white/60', ''),
    ('border border-white', ''),
    ('border-2 border-sky-200', ''),
    ('border-2 border-sky-300', ''),
    ('border-2 border-sky-200', ''),
    ('border-2 border-white', ''),
    ('border-2 border-gray-300', ''),
    ('border-l-4 border-blue-400', ''),
    # 섹션 구분선도 제거
    ('border-t border-gray-300', ''),
    ('border-t border-gray-100', ''),
    ('border-t border-yellow-100', ''),
    ('border-b border-gray-300', ''),
    ('border-b border-gray-100', ''),
    ('border-b border-gray-50', ''),
    ('border-b border-sky-100', ''),
    # 단독 border 클래스 (다음에 space 있어야)
    # 주의: 'border' 단독으로 지우면 border-t 등이 영향받을 수 있으니 생략

    # ── sky 계열 유지 (sky-50, sky-100은 포인트 색으로 유지) ──
    # (sky-100은 내 말풍선 등에 사용)

    # ── 배경색: gray-50 → yellow-50 ──────────────────────
    ('bg-gray-50', 'bg-yellow-50'),

    # ── 구분선 색도 연하게 ────────────────────────────────
    ('bg-gray-200', 'bg-yellow-100'),

    # ── nav 색 ────────────────────────────────────────────
    ('text-sky-300', 'text-sky-400'),
    ('text-sky-300"', 'text-sky-400"'),

    # ── 말풍선 (내꺼: sky-100, 상대방: white) ─────────────
    # border 없는 버전으로 교체
    ('"bg-sky-100 text-sky-900 border border-sky-200 rounded-br-md"',
     '"bg-sky-100 text-sky-900 rounded-br-md"'),
    ('"bg-white text-gray-800 border border-gray-300 rounded-bl-md"',
     '"bg-gray-100 text-gray-800 rounded-bl-md"'),
]

# 커스텀 shadow 클래스 (shadow-[...]) 정규식 제거
SHADOW_PATTERN = re.compile(r"\s?shadow-\[[^\]]+\]\s?")

def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    out = src
    for old, new in REPLACEMENTS:
        out = out.replace(old, new)
    # 커스텀 shadow 제거
    out = SHADOW_PATTERN.sub(' ', out)
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
