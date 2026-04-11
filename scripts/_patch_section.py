import os
os.chdir(r'c:/Projects/living-sketch')

with open('components/shared/toolbar/toolbar-section.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = "import { ToolbarSectionProps } from './types';"
new = """import { ToolbarSectionProps } from './types';
import {
  SECTION_PADDING,
  SECTION_PADDING_MOBILE,
  SECTION_MIN_W_MOBILE,
  SECTION_MIN_H_MOBILE,
} from './constants';"""
content = content.replace(old, new, 1)

with open('components/shared/toolbar/toolbar-section.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
