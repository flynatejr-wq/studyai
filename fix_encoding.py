#!/usr/bin/env python3
# Fix UTF-8 mojibake in JSX/JS files.
# Undefined cp1252 bytes (0x81,0x8D,0x8F,0x90,0x9D) -> U+00XX (Latin-1 fallback).

import os, pathlib

SRC = r"C:\Users\flyna\lecture-summarizer\client\src"

_CP1252_UNDEF = {0x81, 0x8D, 0x8F, 0x90, 0x9D}

def decode_garbled(hex_str):
    b = bytes.fromhex(hex_str)
    return ''.join(
        chr(byte) if byte in _CP1252_UNDEF else bytes([byte]).decode('cp1252')
        for byte in b
    )

w = decode_garbled

REPLACEMENTS = [
    # 4-byte emoji (F0 9F prefix -> ðŸ garbled)

    # 🔥 fire      U+1F525: F0 9F 94 A5
    (w('F09F94A5'), '\U0001F525'),
    # 📚 books     U+1F4DA: F0 9F 93 9A
    (w('F09F939A'), '\U0001F4DA'),
    # 📝 memo      U+1F4DD: F0 9F 93 9D
    (w('F09F939D'), '\U0001F4DD'),
    # 📁 folder    U+1F4C1: F0 9F 93 81
    (w('F09F9381'), '\U0001F4C1'),
    # 📂 open fdr  U+1F4C2: F0 9F 93 82
    (w('F09F9382'), '\U0001F4C2'),
    # 📊 bar chart U+1F4CA: F0 9F 93 8A
    (w('F09F938A'), '\U0001F4CA'),
    # 📕 red book  U+1F4D5: F0 9F 93 95
    (w('F09F9395'), '\U0001F4D5'),
    # 📘 blue book U+1F4D8: F0 9F 93 98
    (w('F09F9398'), '\U0001F4D8'),
    # 📙 orng book U+1F4D9: F0 9F 93 99
    (w('F09F9399'), '\U0001F4D9'),
    # 📄 page      U+1F4C4: F0 9F 93 84
    (w('F09F9384'), '\U0001F4C4'),
    # 📋 clipboard U+1F4CB: F0 9F 93 8B
    (w('F09F938B'), '\U0001F4CB'),
    # 📭 mailbox   U+1F4ED: F0 9F 93 AD  (actual bytes for ðŸ"­ in GuideView)
    (w('F09F93AD'), '\U0001F4ED'),
    # 🔑 key       U+1F511: F0 9F 94 91
    (w('F09F9491'), '\U0001F511'),
    # 🔒 lock      U+1F512: F0 9F 94 92
    (w('F09F9492'), '\U0001F512'),
    # 🔗 link      U+1F517: F0 9F 94 97
    (w('F09F9497'), '\U0001F517'),
    # 🔮 crystal   U+1F52E: F0 9F 94 AE
    (w('F09F94AE'), '\U0001F52E'),
    # 🔭 telescope U+1F52D: F0 9F 94 AD  (different 3rd byte from mailbox above)
    (w('F09F94AD'), '\U0001F52D'),
    # 🔏 lock+pen  U+1F50F: F0 9F 94 8F
    (w('F09F948F'), '\U0001F50F'),
    # 🔍 magnifier U+1F50D: F0 9F 94 8D
    (w('F09F948D'), '\U0001F50D'),

    # 🏆 trophy    U+1F3C6: F0 9F 8F 86
    (w('F09F8F86'), '\U0001F3C6'),
    # 🏛 building  U+1F3DB: F0 9F 8F 9B
    (w('F09F8F9B'), '\U0001F3DB'),
    # 🎯 target    U+1F3AF: F0 9F 8E AF
    (w('F09F8EAF'), '\U0001F3AF'),
    # 🎓 grad cap  U+1F393: F0 9F 8E 93
    (w('F09F8E93'), '\U0001F393'),
    # 🌙 moon      U+1F319: F0 9F 8C 99
    (w('F09F8C99'), '\U0001F319'),
    # 🌐 globe     U+1F310: F0 9F 8C 90
    (w('F09F8C90'), '\U0001F310'),
    # 🌟 glow star U+1F31F: F0 9F 8C 9F
    (w('F09F8C9F'), '\U0001F31F'),
    # 🃏 joker     U+1F0CF: F0 9F 83 8F
    (w('F09F838F'), '\U0001F0CF'),

    # 👋 wave      U+1F44B: F0 9F 91 8B
    (w('F09F918B'), '\U0001F44B'),
    # 💪 muscle    U+1F4AA: F0 9F 92 AA
    (w('F09F92AA'), '\U0001F4AA'),
    # 💯 100       U+1F4AF: F0 9F 92 AF
    (w('F09F92AF'), '\U0001F4AF'),
    # 💎 diamond   U+1F48E: F0 9F 92 8E
    (w('F09F928E'), '\U0001F48E'),
    # 👑 crown     U+1F451: F0 9F 91 91
    (w('F09F9191'), '\U0001F451'),
    # 💾 floppy    U+1F4BE: F0 9F 92 BE
    (w('F09F92BE'), '\U0001F4BE'),
    # 💡 bulb      U+1F4A1: F0 9F 92 A1
    (w('F09F92A1'), '\U0001F4A1'),
    # 💥 explosion U+1F4A5: F0 9F 92 A5
    (w('F09F92A5'), '\U0001F4A5'),
    # 🧠 brain     U+1F9E0: F0 9F A7 A0
    (w('F09FA7A0'), '\U0001F9E0'),
    # 🧘 lotus     U+1F9D8: F0 9F A7 98
    (w('F09FA798'), '\U0001F9D8'),
    # 🖼 picture   U+1F5BC: F0 9F 96 BC
    (w('F09F96BC'), '\U0001F5BC'),
    # 🎙 mic       U+1F399: F0 9F 8E 99
    (w('F09F8E99'), '\U0001F399'),

    # 3-byte sequences
    # — em dash    U+2014: E2 80 94
    (w('E28094'), '—'),
    # – en dash    U+2013: E2 80 93
    (w('E28093'), '–'),
    # • bullet     U+2022: E2 80 A2
    (w('E280A2'), '•'),
    # … ellipsis   U+2026: E2 80 A6
    (w('E280A6'), '…'),
    # ∞ infinity   U+221E: E2 88 9E
    (w('E2889E'), '∞'),
    # ⚡ lightning  U+26A1: E2 9A A1
    (w('E29AA1'), '⚡'),
    # ✅ check grn  U+2705: E2 9C 85
    (w('E29C85'), '✅'),
    # ✨ sparkles   U+2728: E2 9C A8
    (w('E29CA8'), '✨'),
    # ✏ pencil     U+270F: E2 9C 8F
    (w('E29C8F'), '✏'),
    # ✓ check mark U+2713: E2 9C 93
    (w('E29C93'), '✓'),
    # ✗ ballot X   U+2717: E2 9C 97
    (w('E29C97'), '✗'),
    # ✘ heavy X    U+2718: E2 9C 98
    (w('E29C98'), '✘'),
    # ⏰ alarm clk  U+23F0: E2 8F B0
    (w('E28FB0'), '⏰'),
    # ⏱ stopwatch  U+23F1: E2 8F B1
    (w('E28FB1'), '⏱'),
    # ⏳ hourglass  U+23F3: E2 8F B3
    (w('E28FB3'), '⏳'),
    # ⭐ star       U+2B50: E2 AD 90
    (w('E2AD90'), '⭐'),

    # Variation selector FE0F: EF B8 8F
    (w('EFB88F'), '️'),
]

exts = {'.jsx', '.js'}
fixed_count = 0

for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fname in files:
        if pathlib.Path(fname).suffix not in exts:
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content
        for bad, good in REPLACEMENTS:
            if bad in content:
                content = content.replace(bad, good)
        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print('Fixed: ' + fname)
            fixed_count += 1

print('\nDone. ' + str(fixed_count) + ' files updated.')
