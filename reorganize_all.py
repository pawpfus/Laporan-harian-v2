import re

def better_reorganize():
    with open('index.html', 'r') as f:
        content = f.read()

    # Split the file into parts
    head_match = re.search(r'([\s\S]*?)<style>([\s\S]*?)</style>([\s\S]*?)<script>([\s\S]*?)</script>([\s\S]*)', content)
    if not head_match:
        print("Could not parse index.html")
        return

    pre_css = head_match.group(1)
    css_content = head_match.group(2)
    between_css_js = head_match.group(3)
    js_content = head_match.group(4)
    post_js = head_match.group(5)

    # Reorganize CSS
    css_sections = {
        'Reset/Variables': [], 'Layout': [], 'Components': [], 'Features': [], 'Utilities': [], 'Responsive': []
    }
    css_map = {
        'TOPBAR': 'Layout', 'CONTAINER': 'Layout', 'TABS / BOTTOM NAV': 'Layout',
        'ALERT': 'Components', 'CARD': 'Components', 'SECTION LABEL': 'Components',
        'FORM': 'Components', 'SUBMIT BUTTON': 'Components', 'BADGES': 'Components',
        'ROW ACTION BUTTONS': 'Components', 'MODAL': 'Components', 'PAGINATION': 'Components',
        'DATA HEADER': 'Features', 'DOWNLOAD DROPDOWN': 'Features', 'FILTER TOOLBAR': 'Features',
        'WAKTU DROPDOWN': 'Features', 'TABLE': 'Features', 'REKAP': 'Features',
        'STAT CARDS': 'Features', 'CHART CARD': 'Features', 'OFFLINE POPUP': 'Features',
        'PRODUKSI PANEL': 'Features', 'PRODUKSI SUB-TABS': 'Features', 'ANALISIS USAHA TANI': 'Features',
        'AUT LINKED STATE': 'Features', 'EMPTY / LOADING': 'Utilities', 'SETUP CARD (hidden)': 'Utilities',
        'MOBILE': 'Responsive'
    }

    current_section = 'Reset/Variables'
    for line in css_content.splitlines(keepends=True):
        header_match = re.search(r'/\* ── (.+?) ──', line)
        if header_match:
            current_section = css_map.get(header_match.group(1).strip(), 'Features')
        if "=== Section:" not in line:
            css_sections[current_section].append(line)

    new_css = ""
    for section_name in ['Reset/Variables', 'Layout', 'Components', 'Features', 'Utilities', 'Responsive']:
        new_css += f"\n    /* === Section: {section_name} === */\n"
        new_css += "".join(css_sections[section_name])

    # Reorganize JS
    js_sections = {
        'Config': [], 'Utilities': [], 'Core/DB': [], 'Data Ops': [], 'UI Core': [],
        'Reports': [], 'Rekap': [], 'Produksi': [], 'AUT': [], 'Boot': []
    }

    js_lines = js_content.splitlines(keepends=True)

    js_map = {
        'CHART': 'Rekap', 'REKAP': 'Rekap', 'INIT': 'Core/DB', 'ALERT': 'UI Core',
        'DATA OPS': 'Data Ops', 'TABLE': 'Reports', 'EDIT MODAL': 'UI Core',
        'EXPORT': 'Reports', 'TABS': 'UI Core', 'DOWNLOAD DROPDOWN': 'UI Core',
        'PRODUKSI': 'Produksi', 'SUB-TABS PRODUKSI': 'Produksi', 'ANALISIS USAHA TANI': 'AUT',
        'FORM DRAFT': 'UI Core', 'EXPOSE': 'Boot', 'BOOT': 'Boot'
    }

    current_block = 'Config'
    for line in js_lines:
        header_match = re.search(r'// ── (.+?) ──', line)
        if header_match:
            h = header_match.group(1).split('(')[0].strip()
            current_block = js_map.get(h, 'Config')

        if "=== Section:" not in line:
            js_sections[current_block].append(line)

    # Manually move functions to Utilities and UI Core
    utils_functions = ['escHtml', 'getBadge', 'today', 'fmt', 'fmtRp', 'getDateRange']
    ui_functions = ['toggleWaktuDropdown', 'closeAllWaktuDropdowns', 'updateWaktuLabel', 'setActiveWaktuOpt',
                    'applyTableDatePreset', 'applyRekapDatePreset', 'setTableDatePreset', 'setRekapDatePreset',
                    'applyTableCustomRange', 'applyRekapCustomRange']

    all_js_lines = []
    for s in js_sections.values():
        all_js_lines.extend(s)

    new_js_sections = {k: [] for k in js_sections.keys()}

    skip_until = -1
    for i, line in enumerate(all_js_lines):
        if i < skip_until: continue

        # Check if start of a function we want to move
        found_move = False
        target_sec = None

        # Check utilities
        for f_name in utils_functions:
            if f'function {f_name}' in line or f'const {f_name}' in line:
                found_move = True
                target_sec = 'Utilities'
                break

        # Check UI Core
        if not found_move:
            for f_name in ui_functions:
                if f'function {f_name}' in line:
                    found_move = True
                    target_sec = 'UI Core'
                    break
            if "document.addEventListener('click'" in line:
                found_move = True
                target_sec = 'UI Core'

        if found_move:
            brace_count = 0
            j = i
            while j < len(all_js_lines):
                new_js_sections[target_sec].append(all_js_lines[j])
                brace_count += all_js_lines[j].count('{')
                brace_count -= all_js_lines[j].count('}')
                if brace_count == 0 and ('}' in all_js_lines[j] or ';' in all_js_lines[j]):
                    skip_until = j + 1
                    break
                j += 1
        else:
            # Determine which original block this line belonged to
            # Actually, let's just use the blocks but filter out the moved functions
            pass

    # Better approach: rebuild without the moved functions first
    final_js_sections = {k: [] for k in js_sections.keys()}

    moved_functions_code = {'Utilities': [], 'UI Core': []}

    # Extract functions from their original sections
    for sec_name, lines in js_sections.items():
        skip_until_in_sec = -1
        for i, line in enumerate(lines):
            if i < skip_until_in_sec: continue

            found_f = None
            target = None
            for f_name in utils_functions:
                if f'function {f_name}' in line or f'const {f_name}' in line:
                    found_f = f_name
                    target = 'Utilities'
                    break
            if not found_f:
                for f_name in ui_functions:
                    if f'function {f_name}' in line:
                        found_f = f_name
                        target = 'UI Core'
                        break
                if "document.addEventListener('click'" in line:
                    found_f = "click_listener"
                    target = 'UI Core'

            if found_f:
                brace_count = 0
                j = i
                while j < len(lines):
                    moved_functions_code[target].append(lines[j])
                    brace_count += lines[j].count('{')
                    brace_count -= lines[j].count('}')
                    if brace_count == 0 and ('}' in lines[j] or ';' in lines[j]):
                        skip_until_in_sec = j + 1
                        break
                    j += 1
            else:
                final_js_sections[sec_name].append(line)

    # Insert moved functions
    final_js_sections['Utilities'].extend(moved_functions_code['Utilities'])
    final_js_sections['UI Core'].extend(moved_functions_code['UI Core'])

    # Fix the bug in renderAUTCards
    new_render = []
    for line in final_js_sections['AUT']:
        new_render.append(line)
        if 'container.innerHTML = autRows.map((row, idx) => {' in line:
            new_render.append("      const komodOpts=KOMODITAS_LIST.map(k=>'<option' + (k===row.komoditas?' selected':'') + '>' + escHtml(k) + '</option>').join('');\n")
    final_js_sections['AUT'] = new_render

    new_js = ""
    for section_name in ['Config', 'Utilities', 'Core/DB', 'Data Ops', 'UI Core', 'Reports', 'Rekap', 'Produksi', 'AUT', 'Boot']:
        new_js += f"\n  // === Section: {section_name} ===\n"
        new_js += "".join(final_js_sections[section_name])

    new_content = pre_css + "<style>" + new_css + "\n  </style>" + between_css_js + "<script>" + new_js + "\n</script>" + post_js

    with open('index.html', 'w') as f:
        f.write(new_content)

better_reorganize()
print("Reorganization and bug fix complete.")
