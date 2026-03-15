
import re

with open('src/constants.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find ADJECTIVE_COMMENTS array
match = re.search(r'export const ADJECTIVE_COMMENTS = \[(.*?)\];', content, re.DOTALL)
if match:
    array_content = match.group(1)
    # Extract strings
    items = re.findall(r'"([^"]*)"', array_content)
    
    # De-duplicate while preserving order
    seen = set()
    unique_items = []
    for item in items:
        if item not in seen:
            unique_items.append(item)
            seen.add(item)
    
    # Format back to array
    new_array_content = '\n  ' + ',\n  '.join([f'"{item}"' for item in unique_items]) + '\n'
    new_content = content.replace(array_content, new_array_content)
    
    with open('src/constants.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("De-duplicated ADJECTIVE_COMMENTS")
else:
    print("Could not find ADJECTIVE_COMMENTS")
