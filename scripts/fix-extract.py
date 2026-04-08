with open(r'c:\Projects\living-sketch\app\extract\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove extra fragment wrapper in complete phase
old = "              <>\n                <ToolbarSection\n                  icon={<CircularSawIcon />}\n                  label=\"Re-Extract\"\n                  onClick={handleReExtract}\n                  title=\"Reload and start a new extraction\"\n                />\n              </>"
new = "              <ToolbarSection\n                icon={<CircularSawIcon />}\n                label=\"Re-Extract\"\n                onClick={handleReExtract}\n                title=\"Reload and start a new extraction\"\n              />"

if old in content:
    content = content.replace(old, new)
    with open(r'c:\Projects\living-sketch\app\extract\page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done')
else:
    print('NOT FOUND - showing surrounding text')
    idx = content.find('Re-Extract')
    print(repr(content[max(0,idx-200):idx+200]))
