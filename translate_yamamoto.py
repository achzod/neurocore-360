#!/usr/bin/env python3
"""
Translate Yamamoto articles from EN to FR
"""

import json
import time
from deep_translator import GoogleTranslator

IMAGES = {
    "creatine": "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800",
    "beta-alanine": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    "ashwagandha": "https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=800",
    "guarana": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
    "amino": "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=800",
    "probiotic": "https://images.unsplash.com/photo-1563213126-a4273aed2016?w=800",
    "supplement": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
    "carbohydrate": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
    "protein": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800",
    "hydration": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800",
    "dehydration": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800",
    "cycling": "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800",
    "tennis": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
    "sprint": "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800",
    "winter": "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800",
    "energy": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
    "hypertrophy": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",
    "training": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
    "shoulder": "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=800",
    "leg": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800",
    "workout": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800",
    "back": "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=800",
    "pump": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",
    "volumization": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",
    "plicometry": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
    "cross": "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800",
    "triathlon": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800",
    "swimming": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800",
    "padel": "https://images.unsplash.com/photo-1612534847738-b3af6bc8e3dc?w=800",
    "altitude": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
    "stress": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
    "aging": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    "youthfulness": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
}

def get_image(slug):
    """Get image URL for slug"""
    slug_lower = slug.lower()
    for key, url in IMAGES.items():
        if key in slug_lower:
            return url
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"

def translate_text(text, max_chunk=4500):
    """Translate text EN to FR"""
    if not text or len(text.strip()) == 0:
        return ""

    translator = GoogleTranslator(source='en', target='fr')

    if len(text) <= max_chunk:
        try:
            return translator.translate(text)
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    # Split into chunks
    chunks = []
    current_chunk = ""
    sentences = text.replace('. ', '.|').split('|')

    for sentence in sentences:
        if len(current_chunk) + len(sentence) < max_chunk:
            current_chunk += sentence
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence
    if current_chunk:
        chunks.append(current_chunk)

    translated_chunks = []
    for chunk in chunks:
        try:
            translated = translator.translate(chunk)
            translated_chunks.append(translated)
            time.sleep(0.3)
        except Exception as e:
            print(f"Chunk error: {e}")
            translated_chunks.append(chunk)

    return " ".join(translated_chunks)

def main():
    print("Translating Yamamoto articles...")

    # Load scraped data
    input_file = '/Users/achzod/Desktop/neurocore/yamamoto_scraped.json'
    with open(input_file, 'r', encoding='utf-8') as f:
        articles = json.load(f)

    print(f"Found {len(articles)} articles to translate")

    translated = []

    for i, article in enumerate(articles, 1):
        slug = article['slug'][:50]
        print(f"[{i}/{len(articles)}] Translating: {slug}...", end=" ", flush=True)
        print(f"({article['wordCount']} words)", end=" ", flush=True)

        try:
            title_fr = translate_text(article['title'])
            time.sleep(0.2)
            content_fr = translate_text(article['content'])

            excerpt_fr = content_fr[:250].rsplit(' ', 1)[0] + "..."
            fr_words = len(content_fr.split())

            print(f"OK ({fr_words} words, {int(fr_words/article['wordCount']*100)}%)")

            translated.append({
                'id': f"yam-{i}",
                'slug': f"yam-{article['slug'].replace('-a1', '-').replace('-a', '-')[:50]}",
                'title': title_fr,
                'excerpt': excerpt_fr,
                'content': content_fr,
                'author': 'ACHZOD',
                'date': '2025-01-10',
                'category': 'Nutrition',
                'imageUrl': get_image(article['slug'])
            })

            time.sleep(0.5)

        except Exception as e:
            print(f"ERROR: {e}")

    # Save
    output_file = '/Users/achzod/Desktop/neurocore/yamamoto_translated.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(translated, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Translation complete!")
    print(f"Total articles: {len(translated)}")
    print(f"Output file: {output_file}")
    total_words_en = sum(a['wordCount'] for a in articles)
    total_words_fr = sum(len(a['content'].split()) for a in translated)
    print(f"Total words (original): {total_words_en}")
    print(f"Total words (French): {total_words_fr}")

if __name__ == "__main__":
    main()
