with open(r'c:\Projects\living-sketch\components\shared\ui\toolbar\toolbar-section.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the second "export function ToolbarSection" definition
count = 0
second_start = -1
for i, line in enumerate(lines):
    if 'export function ToolbarSection(' in line:
        count += 1
        if count == 2:
            second_start = i
            break

if second_start == -1:
    print('Second ToolbarSection not found')
else:
    # Remove from second_start to end of file (also remove the blank lines before it)
    # Back up to include the blank lines and comment before it
    start = second_start
    while start > 0 and lines[start-1].strip() == '':
        start -= 1
    # Check for comment line before blank lines
    if start > 0 and lines[start-1].strip().startswith('/*'):
        start -= 1

    removed_lines = lines[start:]
    print(f'Removing {len(removed_lines)} lines starting at line {start+1}')
    print('First removed:', repr(lines[start]))
    
    new_content = ''.join(lines[:start])
    with open(r'c:\Projects\living-sketch\components\shared\ui\toolbar\toolbar-section.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Done')
