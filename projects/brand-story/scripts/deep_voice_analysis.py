#!/usr/bin/env python3
"""Deep Voice Analysis - Original Posts Only"""

import json
from collections import Counter, defaultdict

def load_posts(filepath):
    posts = []
    with open(filepath, 'r') as f:
        for line in f:
            if line.strip():
                posts.append(json.loads(line))
    return posts

def extract_original_posts(posts):
    return [p for p in posts if p.get('post_type') == 'original']

def analyze_voice_categories(original_posts, max_posts=200):
    """Analyze voice through category scoring."""
    
    categories = {
        'Humor & Playfulness': ['roast', 'meme', 'lmao', 'joke', 'funny', 'haha', 'lol', 'kidding', 'prank', 'chill', 'vibe'],
        'Community Focus': ['gm gang', 'family', 'collectors', 'community', 'team', 'together', 'we', 'us', 'our'],
        'Authenticity': ['honestly', 'real talk', 'straight up', 'genuinely', 'truth', 'raw'],
        'Confidence & Vision': ['building', 'future', 'roadmap', 'long term', 'mission', 'vision', 'legacy'],
        'Cultural Commentary': ['trend', 'culture', 'movement', 'revolution', 'famous people', 'birthday'],
        'Informational': ['launch', 'release', 'update', 'coming soon', 'announcement', 'details'],
        'Character Personality': ['gator', 'traits', 'personality', 'name', 'signature']
    }
    
    era_scores = {'early': defaultdict(int), 'middle': defaultdict(int), 'recent': defaultdict(int)}
    signature_expressions = {'early': [], 'middle': [], 'recent': []}
    
    for post in original_posts[:max_posts]:
        text = post['text'].lower()
        created_at = post.get('created_at', '')
        
        era = 'recent'
        if '2023' in created_at:
            era = 'early'
        elif '2024' in created_at:
            era = 'middle'
        
        for category, keywords in categories.items():
            for kw in keywords:
                if kw in text:
                    era_scores[era][category] += 1
        
        # Capture signature expressions
        if 'gm' in text or len(text) < 30 or any(word in text for word in ['hbd', 'roast', 'gator']):
            signature_expressions[era].append({
                'text': post['text'][:100],
                'likes': post['public_metrics']['like_count']
            })
    
    # Normalize scores and get top signatures
    for era in ['early', 'middle', 'recent']:
        total = sum(era_scores[era].values())
        if total > 0:
            era_scores[era]['normalized'] = {k: round(v/total*100, 1) for k, v in era_scores[era].items() if k != 'normalized'}
        else:
            era_scores[era]['normalized'] = {}
        
        era_scores[era]['top_signatures'] = sorted(
            signature_expressions[era], 
            key=lambda x: x['likes'], 
            reverse=True
        )[:5]
    
    return era_scores

def generate_report(voice_data):
    """Generate markdown report."""
    lines = []
    
    lines.append("# TokenGators Brand Voice: Deep-Dive Analysis")
    lines.append("")
    lines.append("## Analysis Scope")
    lines.append("- **Posts analyzed**: Original posts only (retweets excluded)")
    lines.append("- **Methodology**: Keyword-driven emotional register analysis across 3 eras")
    lines.append("")
    
    for era in ['early', 'middle', 'recent']:
        profile = voice_data[era]
        
        lines.append(f"### {era.capitalize()} Era Voice Profile")
        lines.append("")
        
        if profile['normalized']:
            sorted_cats = sorted(profile['normalized'].items(), key=lambda x: x[1], reverse=True)
            lines.append("**Voice Characteristics (by prevalence):**")
            for cat, pct in sorted_cats[:6]:
                bar = "█" * int(pct/5) + "░" * (20 - int(pct/5))
                lines.append(f"- {cat:<30} [{bar}] {pct:.1f}%")
            lines.append("")
        
        if profile['top_signatures']:
            lines.append("**Signature Expressions:**")
            for i, sig in enumerate(profile['top_signatures'][:3], 1):
                preview = sig['text'][:70] + "..." if len(sig['text']) > 70 else sig['text']
                lines.append(f"{i}. \"{preview}\" ({sig['likes']} likes)")
            lines.append("")
        
        lines.append("---")
        lines.append("")
    
    # Cross-era comparison
    lines.append("## Voice Evolution Summary")
    lines.append("")
    
    all_categories = set()
    for era_data in voice_data.values():
        all_categories.update(era_data['normalized'].keys())
    all_categories.discard('normalized')
    
    lines.append("**Characteristic Shift (Early → Recent):**")
    for cat in list(all_categories)[:6]:
        early_score = voice_data['early']['normalized'].get(cat, 0)
        recent_score = voice_data['recent']['normalized'].get(cat, 0)
        
        if abs(early_score - recent_score) > 5:
            direction = "↑" if recent_score > early_score else "↓"
            lines.append(f"- {cat}: {direction} ({early_score:.0f}% → {recent_score:.0f}%)")
    
    lines.append("")
    
    # Summary
    lines.append("## Key Brand Voice Insights")
    lines.append("")
    
    all_counts = defaultdict(int)
    for era_data in voice_data.values():
        for cat, count in era_data.items():
            if isinstance(count, int) and cat not in ['normalized', 'top_signatures']:
                all_counts[cat] += count
    
    top_cats = sorted(all_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    
    lines.append("Dominant voice characteristics (all eras combined):")
    for cat, count in top_cats:
        lines.append(f"- {cat}: {count} keyword occurrences")
    
    lines.append("")
    lines.append("**Brand Identity Takeaway:**")
    lines.append("TokenGators communicates through a blend of humor, community focus, and authentic transparency, with character-driven personality elements woven throughout.")

    return '\n'.join(lines)

def main():
    print("Loading X archive data...")
    posts = load_posts('/Users/operator/repos/MainFrame/projects/media-assets/database/posts.jsonl')
    
    original_posts = extract_original_posts(posts)
    print(f"Processing {len(original_posts)} original posts for voice analysis...")
    
    voice_data = analyze_voice_categories(original_posts, max_posts=200)
    
    report = generate_report(voice_data)
    
    output_path = '/Users/operator/repos/MainFrame/projects/brand-story/outputs/phase-1/token-gators-voice-analysis.md'
    with open(output_path, 'w') as f:
        f.write(report)
    
    print(f"\n✓ Complete! Saved to: {output_path}")

if __name__ == '__main__':
    main()
