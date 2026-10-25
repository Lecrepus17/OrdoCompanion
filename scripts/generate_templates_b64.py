import base64
import os

os.makedirs('src/assets', exist_ok=True)

with open('public/assets/sheets/base_front.png', 'rb') as f:
    base_front_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('public/assets/sheets/base_back.png', 'rb') as f:
    base_back_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('public/assets/sheets/sh_front.png', 'rb') as f:
    sh_front_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('public/assets/sheets/sh_back.png', 'rb') as f:
    sh_back_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('src/assets/sheetTemplates.ts', 'w', encoding='utf-8') as out:
    out.write('// Auto-generated base64 backgrounds for character sheets\n')
    out.write(f'export const BASE_FRONT_B64 = "data:image/png;base64,{base_front_b64}";\n')
    out.write(f'export const BASE_BACK_B64 = "data:image/png;base64,{base_back_b64}";\n')
    out.write(f'export const SH_FRONT_B64 = "data:image/png;base64,{sh_front_b64}";\n')
    out.write(f'export const SH_BACK_B64 = "data:image/png;base64,{sh_back_b64}";\n')

print('sheetTemplates.ts created successfully, size:', os.path.getsize('src/assets/sheetTemplates.ts'))
