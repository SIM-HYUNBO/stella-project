import os
import re

dirs = [r'c:\Project\stella-project\app', r'c:\Project\stella-project\components']
exts = ('.tsx', '.ts', '.jsx', '.js')
exclude = {'node_modules', '.next', 'android', 'out', 'public'}

# bg-from-X to-Y via-Z 패턴을 적절한 단색으로 치환
# 색 분류: 따뜻한 계열 → yellow-100, 차가운/기타 → sky-100
WARM = {'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald'}
COOL = {'sky', 'blue', 'cyan', 'indigo', 'violet', 'purple', 'pink', 'rose', 'slate', 'gray', 'zinc', 'teal'}

def pick_color(color_name: str) -> str:
    if color_name in WARM:
        return 'yellow-100'
    return 'sky-100'

# bg-from-X(optional: -NNN) to-Y(optional: -NNN) via-Z(optional)
BG_FROM_PATTERN = re.compile(
    r'bg-from-([a-z]+(?:-\d+)?)'      # bg-from-sky-300
    r'(?:\s+via-[a-z]+-\d+)?'         # optional via-*
    r'\s+to-[a-z]+-\d+'               # to-*
)

def replacer(m):
    first_color = m.group(1).split('-')[0]  # e.g. "sky" from "sky-300"
    return 'bg-' + pick_color(first_color)

# 또한 bg-from-X 단독 (to- 없이 남은 것)
BG_FROM_ALONE = re.compile(r'bg-from-([a-z]+(?:-\d+)?)')
def alone_replacer(m):
    first_color = m.group(1).split('-')[0]
    return 'bg-' + pick_color(first_color)

# 남은 dangling "to-X" (앞에 from이 없는 경우)
DANGLING_TO = re.compile(r'\s+to-[a-z]+-\d+\b')

# 남은 "via-X" 단독
DANGLING_VIA = re.compile(r'\s+via-[a-z]+-\d+/?\d*\b')

# bg-clip-text / text-transparent (gradient text 잔재)
CLIP_TEXT = [
    (' bg-clip-text', ''),
    (' text-transparent', ''),
]

# 잔여 특수 케이스
MANUAL = [
    # diary 무드 배경 (dynamic) - 이미 bg- prefix 제거됨
    ('bg-${moodBg[todayEntry.mood] || "from-orange-100 to-amber-50"}', 'bg-yellow-50'),
    ('bg-${moodBg[entry.mood] || "from-orange-100 to-amber-50"}', 'bg-yellow-50'),
    # tetris 활성 테두리
    ('border-orange-400 scale-105 bg-yellow-50', 'scale-105 bg-yellow-50'),
    # AppLock 핀 활성
    ('bg-red-400 border-red-400', 'bg-red-400'),
    ('bg-orange-400 border-orange-400', 'bg-sky-400'),
    ('bg-orange-400', 'bg-sky-400'),
    # 잔여 border-orange
    ('border-orange-400', ''),
    ('border-orange-300', ''),
    ('border-orange-200', ''),
    ('border-orange-100', ''),
    # from-amber in color variables
    ('"from-amber-400 to-orange-400"', '"bg-yellow-100"'),
    ('"from-amber-400 to-yellow-300"', '"bg-yellow-100"'),
    # tetris red border
    (' border border-red-200', ''),
]

def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    out = src
    # 1. bg-from-X to-Y 패턴
    out = BG_FROM_PATTERN.sub(replacer, out)
    # 2. 남은 bg-from-X 단독
    out = BG_FROM_ALONE.sub(alone_replacer, out)
    # 3. dangling to-* / via-*
    out = DANGLING_TO.sub('', out)
    out = DANGLING_VIA.sub('', out)
    # 4. bg-clip-text / text-transparent
    for old, new in CLIP_TEXT:
        out = out.replace(old, new)
    # 5. manual fixes
    for old, new in MANUAL:
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
