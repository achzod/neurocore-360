#!/usr/bin/env python3
"""
Compile Yamamoto JSON to TypeScript
"""

import json
import re

def escape_string(text):
    """Escape text for TypeScript template literal"""
    if not text:
        return ""
    # Remove any control characters
    text = text.replace('\\', '\\\\')
    text = text.replace('`', '\\`')
    text = text.replace('${', '\\${')
    # Replace newlines with spaces
    text = text.replace('\n', ' ')
    text = text.replace('\r', '')
    text = text.replace('\t', ' ')
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def main():
    print("Compiling Yamamoto articles to TypeScript...")

    # Load translated articles
    with open('/Users/achzod/Desktop/neurocore/yamamoto_translated.json', 'r', encoding='utf-8') as f:
        articles = json.load(f)

    print(f"Loaded {len(articles)} articles")

    # Generate TypeScript
    ts_content = '''import { BlogArticle } from '../types/blog';

export const yamamotoArticles: BlogArticle[] = [
'''

    for i, article in enumerate(articles):
        ts_content += f'''  {{
    id: `{article['id']}`,
    slug: `{escape_string(article['slug'])}`,
    title: `{escape_string(article['title'])}`,
    excerpt: `{escape_string(article['excerpt'])}`,
    content: `{escape_string(article['content'])}`,
    author: `{article['author']}`,
    date: `{article['date']}`,
    category: `{article['category']}`,
    imageUrl: `{article['imageUrl']}`
  }}'''

        if i < len(articles) - 1:
            ts_content += ','
        ts_content += '\n'

    ts_content += '];\n'

    # Write TypeScript file
    output_file = '/Users/achzod/Desktop/neurocore/client/src/data/yamamotoArticles.ts'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print(f"Compiled to: {output_file}")
    print(f"Total articles: {len(articles)}")

if __name__ == "__main__":
    main()
