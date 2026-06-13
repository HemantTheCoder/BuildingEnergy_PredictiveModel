import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'DASHBOARD_HTML = \"\"\"(.*?)\"\"\"', content, re.DOTALL)
if match:
    html = match.group(1)
    with open('test.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Extracted successfully!")
else:
    print("Could not find DASHBOARD_HTML")
