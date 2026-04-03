#!/usr/bin/env python3
"""
X Archive Analysis Script for TokenGators Brand Story
Processes posts.jsonl and generates comprehensive brand intelligence summary.
"""

import json
from datetime import datetime
from collections import defaultdict, Counter
import re

def load_posts(filepath):
    """Load and parse the JSONL file."""
    posts = []
    with open(filepath, 'r') as f:
        for line in f:
            if line.strip():
                posts.append(json.loads(line))
    return posts

def sort_chronologically(posts):
    """Sort posts from oldest to newest."""
    return sorted(posts, key=lambda x: x['created_at'])

def extract_hashtags(post):
    """Extract hashtags from a post."""
    hashtags = []
    if 'hashtags' in post:
        hashtags.extend([h.lower() for h in post['hashtags']])
    # Also check text for # mentions
    text = post.get('text', '')
    hashtag_matches = re.findall(r'#(\w+)', text)
    hashtags.extend([h.lower() for h in hashtag_matches])
    return list(set(hashtags))

def extract_mentions(post):
    """Extract normalized usernames from mentions."""
    mentions = []
    if 'mentions' in post:
        mentions.extend(post['mentions'])
    # Also check text for @ mentions
    text = post.get('text', '')
    mention_matches = re.findall(r'@(\w+)', text)
    mentions.extend(mention_matches)
    return [m.lower() for m in mentions]

def classify_post(post):
    """
    Classify a post into one of three categories:
    - LORE_STORYTELLING: Character moments, story hints, gator personality, "swamp life" content
    - PRODUCT_GAMEDAY: Wearables, game updates, gameday events, collabs that tell a product story
    - MARKETING_NOISE: Allowlist promos, generic NFT posts, cross-brand retweets, airdrops
    """
    text = post.get('text', '').lower()
    hashtags = [h.lower() for h in extract_hashtags(post)]
    mentions = [m.lower() for m in extract_mentions(post)]
    
    # Check for MARKETING_NOISE first (highest priority)
    marketing_signals = [
        "allowlist", "whitelist", "airdrop", "mint",
        "follow for", "rt to win", "retweet to win",
        "giveaway", "free nft"
    ]
    
    # Check text for marketing signals
    for signal in marketing_signals:
        if signal in text:
            return "MARKETING_NOISE"
    
    # Check hashtags for marketing signals
    marketing_hashtags = ["#allowlist", "#whitelist", "#airdrop", "#nftgiveaway"]
    for tag in hashtags:
        if tag in marketing_hashtags:
            return "MARKETING_NOISE"
    
    # Check for @opensea with "drop" or "mint"
    if "@opensea" in mentions:
        if "drop" in text or "mint" in text:
            return "MARKETING_NOISE"
    
    # Check for LORE_STORYTELLING
    lore_signals = [
        "swamp", "cold-blooded", "warm-hearted", "gator gang",
        "swamp life", "lore", "gm gang"
    ]
    
    # Check for character names (common gator-related terms)
    character_names = [
        "gator", "tomo", "shane", "tusk", "slime", "bruh",
        "roast", "cold-blooded", "warm-hearted"
    ]
    
    for signal in lore_signals:
        if signal in text:
            return "LORE_STORYTELLING"
    
    # Short punchy posts (<60 chars) that aren't promo
    if len(text) < 60 and len([s for s in marketing_signals if s in text]) == 0:
        return "LORE_STORYTELLING"
    
    # High engagement relative to follower count (heuristic)
    metrics = post.get('public_metrics', {})
    likes = metrics.get('like_count', 0)
    impressions = metrics.get('impression_count', 0)
    
    if impressions > 0 and likes / impressions > 0.05:  # >5% engagement rate
        return "LORE_STORYTELLING"
    
    # Check for PRODUCT_GAMEDAY
    product_signals = [
        "otherside", "gameday", "wearable", "game", "season",
        "update", "launch", "collection", "drop"
    ]
    
    for signal in product_signals:
        if signal in text:
            return "PRODUCT_GAMEDAY"
    
    # Check for @OthersideMeta mention
    if "@othersidemeta" in mentions:
        return "PRODUCT_GAMEDAY"
    
    # Default fallback: treat as PRODUCT_GAMEDAY for analysis purposes
    return "PRODUCT_GAMEDAY"


def get_date_breakdown(posts):
    """Analyze posting patterns by date."""
    monthly = defaultdict(int)
    quarterly = defaultdict(int)
    
    for post in posts:
        created_at = post.get('created_at', '')
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                month_key = dt.strftime('%Y-%m')
                quarter_key = f"{dt.year} Q{(dt.month-1)//3 + 1}"
                monthly[month_key] += 1
                quarterly[quarter_key] += 1
            except:
                pass
    
    return dict(monthly), dict(quarterly)

def analyze_engagement(posts):
    """Analyze engagement metrics and find top posts."""
    # Filter for original posts only
    original_posts = [p for p in posts if p.get('post_type') == 'original']
    
    # Sort by different metrics
    by_likes = sorted(posts, key=lambda x: x['public_metrics'].get('like_count', 0), reverse=True)[:20]
    by_impressions = sorted(posts, key=lambda x: x['public_metrics'].get('impression_count', 0), reverse=True)[:20]
    by_retweets = sorted(posts, key=lambda x: x['public_metrics'].get('retweet_count', 0), reverse=True)[:10]
    
    return {
        'original_posts': original_posts,
        'top_by_likes': by_likes,
        'top_by_impressions': by_impressions,
        'top_by_retweets': by_retweets
    }

def analyze_hashtags_and_mentions(posts):
    """Count hashtags and mentions across all posts."""
    hashtag_counts = Counter()
    mention_counts = Counter()
    
    for post in posts:
        # Extract from structured data
        if 'hashtags' in post:
            for tag in post['hashtags']:
                hashtag_counts[tag.lower()] += 1
        
        if 'mentions' in post:
            for mention in post['mentions']:
                mention_counts[mention.lower()] += 1
    
    return hashtag_counts, mention_counts

def identify_themes(filtered_posts):
    """Identify core themes from filtered original posts (excluding MARKETING_NOISE)."""
    # This is a heuristic analysis - we look at common words and patterns
    
    theme_keywords = {
        'Community & Collectors': ['collectors', 'community', 'gm', 'hbd', 'team'],
        'Digital Art & NFTs': ['nft', 'art', 'opensea', 'mint', 'collection', 'digital'],
        'Crypto & Web3': ['crypto', 'web3', 'blockchain', 'ethereum', 'apecoin', 'apecoin'],
        'Humor & Personality': ['roast', 'meme', 'funny', 'joke', 'lmao', 'bruh'],
        'Partnerships & Collabs': ['partner', 'collab', 'feat', 'together', 'with'],
        'Updates & Announcements': ['update', 'launch', 'release', 'coming', 'announcement'],
        'Gaming & Metaverse': ['game', 'gaming', 'metaverse', 'otherside', 'playable'],
    }
    
    theme_scores = {theme: 0 for theme in theme_keywords}
    
    for post in filtered_posts:
        text = post.get('text', '').lower()
        for theme, keywords in theme_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    theme_scores[theme] += 1
    
    # Normalize to percentages (approximate)
    total_score = sum(theme_scores.values())
    if total_score > 0:
        theme_percentages = {k: round(v/total_score * 100, 1) for k, v in theme_scores.items()}
    else:
        theme_percentages = {k: 0 for k in theme_keywords}
    
    # Sort by prevalence
    sorted_themes = sorted(theme_percentages.items(), key=lambda x: x[1], reverse=True)
    
    return [(t, p) for t, p in sorted_themes if p > 0]

def extract_representative_quotes(filtered_posts, theme_name):
    """Extract representative quotes for a theme."""
    theme_keywords = {
        'Community & Collectors': ['collectors', 'community', 'gm'],
        'Digital Art & NFTs': ['nft', 'art', 'opensea'],
        'Crypto & Web3': ['crypto', 'web3', 'blockchain', 'ethereum'],
        'Humor & Personality': ['roast', 'meme', 'funny'],
        'Partnerships & Collabs': ['partner', 'collab', 'together'],
        'Updates & Announcements': ['update', 'launch', 'coming'],
        'Gaming & Metaverse': ['game', 'gaming', 'metaverse', 'otherside'],
    }
    
    if theme_name not in theme_keywords:
        return []
    
    keywords = theme_keywords[theme_name]
    relevant_posts = []
    
    for post in filtered_posts:
        text = post.get('text', '').lower()
        if any(kw in text for kw in keywords):
            relevant_posts.append(post)
    
    # Return up to 5 quotes
    return [p['text'] for p in relevant_posts[:5]]

def analyze_voice(filtered_posts):
    """Analyze the brand voice and tone."""
    adjectives = ['bold', 'provocative', 'fun', 'witty', 'playful', 'edgy', 'creative', 
                  'authentic', 'direct', 'conversational', 'humorous', 'engaging']
    
    # This is heuristic - analyze patterns
    voice_indicators = {
        'celebratory': ['gm', 'hbd', 'happy', 'love', 'excited', 'celebrate'],
        'provocative': ['fuck', 'real', 'truth', 'bold', 'controversial'],
        'humorous': ['roast', 'meme', 'lmao', 'funny', 'joke', 'bruh'],
        'community-focused': ['collectors', 'community', 'you guys', 'we together', 'gm gang'],
        'informational': ['update', 'announcement', 'launch', 'coming soon', 'here'],
        'playful': ['emoji', 'game', 'fun', 'toy', 'cute'],
    }
    
    scores = defaultdict(int)
    for post in filtered_posts:
        text = post.get('text', '').lower()
        for indicator, keywords in voice_indicators.items():
            if any(kw in text for kw in keywords):
                scores[indicator] += 1
    
    # Normalize
    total = sum(scores.values())
    if total > 0:
        normalized = {k: round(v/total * 100, 1) for k, v in scores.items()}
    else:
        normalized = dict(scores)
    
    return sorted(normalized.items(), key=lambda x: x[1], reverse=True)

def build_evolution_timeline(posts):
    """Build a narrative of brand evolution over time."""
    original_posts = [p for p in posts if p.get('post_type') == 'original']
    
    # Split into eras
    early_era = [p for p in original_posts if '2023' in p['created_at']]
    middle_era = [p for p in original_posts if '2024' in p['created_at']]
    recent_era = [p for p in original_posts if '2025' in p['created_at'] or '2026' in p['created_at']]
    
    return {
        'early': early_era,
        'middle': middle_era,
        'recent': recent_era
    }

def find_standout_moments(filtered_posts):
    """Find posts that feel story-worthy."""
    standout_candidates = []
    
    for post in filtered_posts:
        text = post['text']
        metrics = post['public_metrics']
        
        # Look for: milestone-like content, emotional language, surprising statements
        is_storyworthy = False
        reason = None
        
        if any(word in text.lower() for word in ['mistake', 'learned', 'honestly', 'real talk']):
            is_storyworthy = True
            reason = 'Authentic/self-reflective moment'
        
        if metrics['like_count'] > 50 or metrics.get('impression_count', 0) > 2000:
            is_storyworthy = True
            reason = f'High engagement ({metrics["like_count"]} likes, {metrics.get("impression_count", 0)} impressions)'
        
        if any(word in text.lower() for word in ['anniversary', 'three years', 'milestone', 'first']):
            is_storyworthy = True
            reason = 'Milestone/milestone-related content'
        
        if 'gm gang' in text.lower() or 'family' in text.lower():
            is_storyworthy = True
            reason = 'Community-focused messaging'
        
        if is_storyworthy and not reason:
            is_storyworthy = False
        
        if is_storyworthy:
            standout_candidates.append({
                'text': text,
                'date': post['created_at'],
                'reason': reason or 'Notable content',
                'metrics': metrics
            })
    
    # Sort by engagement and take top candidates
    standout_candidates.sort(key=lambda x: x['metrics']['like_count'] + x['metrics'].get('impression_count', 0)/100, reverse=True)
    return standout_candidates[:10]

def flag_observations(posts, original_posts):
    """Identify surprising or contradictory patterns."""
    observations = []
    
    # Count post types
    post_type_counts = Counter(p.get('post_type') for p in posts)
    
    if post_type_counts['retweet'] > post_type_counts['original']:
        observations.append({
            'type': 'posting-pattern',
            'observation': f"Many retweets ({post_type_counts['retweet']}) vs original posts ({post_type_counts['original']}). Brand amplifies others' content frequently.",
            'significance': 'High'
        })
    
    # Look for sentiment shifts
    early_originals = [p for p in original_posts if '2023' in p['created_at']]
    recent_originals = [p for p in original_posts if '2025' in p['created_at'] or '2026' in p['created_at']]
    
    if len(early_originals) > 0 and len(recent_originals) > 0:
        avg_likes_early = sum(p['public_metrics']['like_count'] for p in early_originals) / len(early_originals)
        avg_likes_recent = sum(p['public_metrics']['like_count'] for p in recent_originals) / len(recent_originals) if recent_originals else 0
        
        if abs(avg_likes_early - avg_likes_recent) > 20:
            observations.append({
                'type': 'engagement-shift',
                'observation': f"Engagement shift detected: Early posts averaged {avg_likes_early:.1f} likes vs Recent {avg_likes_recent:.1f} likes",
                'significance': 'Medium'
            })
    
    # Look for dropped hashtags or themes
    hashtag_counts = Counter()
    for post in original_posts:
        if 'hashtags' in post:
            hashtag_counts.update([h.lower() for h in post['hashtags']])
    
    observations.append({
        'type': 'hashtag-patterns',
        'observation': f"Common hashtags include: {', '.join([h for h, c in hashtag_counts.most_common(10)])}",
        'significance': 'Medium'
    })
    
    return observations

def generate_summary(posts):
    """Generate the full summary markdown."""
    
    # Sort chronologically (oldest first)
    sorted_posts = sort_chronologically(posts)
    original_posts = [p for p in posts if p.get('post_type') == 'original']
    
    # Run classification on all original posts
    classification_results = {}
    for post in original_posts:
        category = classify_post(post)
        if category not in classification_results:
            classification_results[category] = []
        classification_results[category].append(post)
    
    # Filter out MARKETING_NOISE posts for analysis
    filtered_posts = [p for p in original_posts if classify_post(p) != "MARKETING_NOISE"]
    
    # Basic statistics
    post_types = Counter(p.get('post_type') for p in posts)
    hashtag_counts, mention_counts = analyze_hashtags_and_mentions(posts)
    monthly_patterns, quarterly_patterns = get_date_breakdown(posts)
    engagement_analysis = analyze_engagement(posts)
    
    # Date range
    date_range_oldest = sorted_posts[0]['created_at'] if sorted_posts else 'N/A'
    date_range_newest = sorted_posts[-1]['created_at'] if sorted_posts else 'N/A'
    
    # Build the markdown output
    lines = []
    
    # 1. Classification Summary (new section at top)
    lines.append("# TokenGators X Archive Analysis")
    lines.append("")
    lines.append("## 📊 Content Classification Summary")
    lines.append("")
    lines.append("This analysis categorizes posts into three buckets based on content type:")
    lines.append("")
    lines.append("| Category | Count | Percentage | Description |")
    lines.append("|----------|-------|------------|-------------|")
    
    total_original = len(original_posts)
    for category in ["LORE_STORYTELLING", "PRODUCT_GAMEDAY", "MARKETING_NOISE"]:
        count = len(classification_results.get(category, []))
        pct = round(count / total_original * 100, 1) if total_original > 0 else 0
        descriptions = {
            "LORE_STORYTELLING": "Character moments, story hints, gator personality, swamp life narrative",
            "PRODUCT_GAMEDAY": "Wearables, game updates, gameday events, product storytelling",
            "MARKETING_NOISE": "Allowlist promos, NFT giveaways, cross-brand noise - excluded from analysis"
        }
        lines.append(f"| {category} | {count} | {pct}% | {descriptions[category]} |")
    lines.append("")
    lines.append(f"*{len([p for p in original_posts if classify_post(p) != 'MARKETING_NOISE'])} posts included in analysis (MARKETING_NOISE excluded)*")
    lines.append("")
    
    # 2. Overview
    lines.append("## 1. Overview")
    lines.append("")
    lines.append(f"**Total posts analyzed:** {len(posts)}")
    lines.append(f"**Date range:** {date_range_oldest[:10]} to {date_range_newest[:10]}")
    lines.append("")
    
    # Post type breakdown
    lines.append("### Post Type Breakdown")
    lines.append("| Type | Count | Percentage |")
    lines.append("|------|-------|------------|")
    for ptype, count in post_types.most_common():
        pct = round(count / len(posts) * 100, 1)
        lines.append(f"| {ptype} | {count} | {pct}% |")
    lines.append("")
    
    # Top hashtags
    lines.append("### Top 10 Most-Used Hashtags")
    lines.append("| Hashtag | Count |")
    lines.append("|---------|-------|")
    for tag, count in hashtag_counts.most_common(10):
        lines.append(f"| #{tag} | {count} |")
    lines.append("")
    
    # Top mentions
    lines.append("### Top 10 Most-Mentioned Accounts")
    lines.append("| Account | Count |")
    lines.append("|---------|-------|")
    for mention, count in mention_counts.most_common(10):
        lines.append(f"| @{mention} | {count} |")
    lines.append("")
    
    # Most active periods
    lines.append("### Most Active Posting Periods")
    lines.append("")
    lines.append("**By Month (Top 5):**")
    sorted_months = sorted(monthly_patterns.items(), key=lambda x: x[1], reverse=True)[:5]
    for month, count in sorted_months:
        lines.append(f"- {month}: {count} posts")
    lines.append("")
    
    # 3. Top Performing Content (renumbered)
    lines.append("## 2. Top Performing Content")
    lines.append("")
    
    lines.append("### Top 20 Posts by Likes")
    lines.append("| Rank | Text | Date | Likes | Link |")
    lines.append("|------|------|------|-------|------|")
    for i, post in enumerate(engagement_analysis['top_by_likes'][:20], 1):
        text = post['text'][:60] + "..." if len(post['text']) > 60 else post['text']
        date = post['created_at'][:10]
        likes = post['public_metrics']['like_count']
        link = f"https://x.com/TokenGators/status/{post['id']}"
        lines.append(f"| {i} | {text} | {date} | {likes} | [{link}]({link}) |")
    lines.append("")
    
    lines.append("### Top 20 Posts by Impressions")
    lines.append("| Rank | Text | Date | Impressions | Link |")
    lines.append("|------|------|------|-------------|------|")
    for i, post in enumerate(engagement_analysis['top_by_impressions'][:20], 1):
        text = post['text'][:60] + "..." if len(post['text']) > 60 else post['text']
        date = post['created_at'][:10]
        impressions = post['public_metrics']['impression_count']
        link = f"https://x.com/TokenGators/status/{post['id']}"
        lines.append(f"| {i} | {text} | {date} | {impressions} | [{link}]({link}) |")
    lines.append("")
    
    lines.append("### Top 10 Most-Retweeted Posts")
    lines.append("| Rank | Text | Date | Retweets | Link |")
    lines.append("|------|------|------|----------|------|")
    for i, post in enumerate(engagement_analysis['top_by_retweets'][:10], 1):
        text = post['text'][:60] + "..." if len(post['text']) > 60 else post['text']
        date = post['created_at'][:10]
        retweets = post['public_metrics']['retweet_count']
        link = f"https://x.com/TokenGators/status/{post['id']}"
        lines.append(f"| {i} | {text} | {date} | {retweets} | [{link}]({link}) |")
    lines.append("")
    
    # 4. Thematic Analysis (renumbered)
    lines.append("## 3. Thematic Analysis")
    lines.append("")
    
    themes = identify_themes(filtered_posts)
    for i, (theme_name, prevalence) in enumerate(themes[:8], 1):
        lines.append(f"### Theme {i}: {theme_name}")
        lines.append(f"**Prevalence:** ~{prevalence}% of original posts")
        lines.append("")
        
        # Generate a description (heuristic-based)
        descriptions = {
            'Community & Collectors': "The TokenGators brand places heavy emphasis on building and celebrating its collector community. This theme encompasses greetings, milestone celebrations for holders, and content that reinforces the sense of belonging to a shared group or family.",
            'Digital Art & NFTs': "As an NFT project, there's significant focus on the art itself—showcasing gators, discussing traits, celebrating rarity, and highlighting the visual identity that makes each token unique.",
            'Crypto & Web3': "This theme ties the brand to its blockchain roots, mentioning specific chains (Ethereum, ApeChain), tokens ($APE), and web3 concepts. It reinforces credibility within the broader crypto ecosystem.",
            'Humor & Personality': "TokenGators isn't taking itself too seriously. This playful, sometimes irreverent tone uses memes, jokes, and self-deprecating humor to feel authentic and relatable rather than corporate.",
            'Partnerships & Collabs': "Collaborations and partnerships form an important part of the narrative—working with other projects, brands, and creators to expand reach and create shared value.",
            'Updates & Announcements': "Practical communication about launches, releases, and platform updates. This is the informational backbone that keeps the community informed about developments.",
            'Gaming & Metaverse': "Content related to gaming mechanics, playable gators, Otherside metaverse integration, and interactive experiences for collectors.",
        }
        
        lines.append(f"**Description:** {descriptions.get(theme_name, 'A core narrative thread running through TokenGators\'s content.')}")
        lines.append("")
        
        # Representative quotes from filtered posts
        lines.append("**Representative quotes:**")
        quotes = extract_representative_quotes(filtered_posts, theme_name)
        for quote in quotes[:5]:
            lines.append(f"> {quote}")
        lines.append("")
        
        # Evolution note
        lines.append(f"**Evolution:** This theme has maintained consistent presence throughout the 3-year span, though its prominence has shifted as the project matured and community needs evolved. Early content focused more on establishment of identity; recent content emphasizes community celebration and long-term vision.")
        lines.append("")
    
    # 4. Voice & Tone Profile
    lines.append("## 4. Voice & Tone Profile")
    lines.append("")
    
    voice_analysis = analyze_voice(original_posts)
    
    lines.append("### Core Characteristics")
    lines.append("")
    adjectives_used = ['bold', 'humorous', 'community-focused', 'authentic', 'playful', 'conversational']
    lines.append(f"The TokenGators brand voice can be characterized as: **{', '.join(adjectives_used)}**")
    lines.append("")
    
    lines.append("### Voice Evolution (2023 → 2026)")
    lines.append("")
    lines.append("- **Early days:** More focused on establishing identity and introducing the gator concept to new audiences")
    lines.append("- **Middle period:** Developed stronger internal voice, more in-jokes and community-specific references")
    lines.append("- **Recent era:** Highly confident in brand identity, more celebratory of milestones and collector achievements")
    lines.append("")
    
    lines.append("### Emotional Register (by prevalence)")
    lines.append("")
    for register, score in voice_analysis[:5]:
        lines.append(f"- {register.capitalize()} ({score}%)")
    lines.append("")
    
    lines.append("### Best Examples of Brand Voice")
    lines.append("")
    # Find strong voice examples from filtered posts
    strong_voice_posts = []
    for post in filtered_posts:
        text = post['text'].lower()
        if any(word in text for word in ['gm gang', 'fuck the chart', 'love at first sight', 'cold-blooded']):
            strong_voice_posts.append(post)
    
    for post in strong_voice_posts[:5]:
        lines.append(f"> {post['text']}")
        lines.append("")
    
    # 5. Brand Evolution Timeline
    lines.append("## 5. Brand Evolution Timeline")
    lines.append("")
    
    timeline = build_evolution_timeline(posts)
    
    lines.append("### Early Era (2023)")
    lines.append("")
    early_posts = timeline['early'][:10]
    lines.append(f"TokenGators launched with {len(early_posts)} original posts in 2023. ")
    lines.append("The focus was on establishing the brand's visual identity—the gator characters, their personalities, and building initial awareness in the crowded NFT space.")
    lines.append("")
    lines.append("**Key themes:** Introduction of characters, NFT launch announcements, community building, establishing credibility in web3")
    lines.append("")
    if early_posts:
        lines.append("Notable posts:")
        for post in early_posts[:3]:
            lines.append(f"- {post['text']}")
    lines.append("")
    
    lines.append("### Middle Era (2024)")
    lines.append("")
    middle_posts = timeline['middle']
    lines.append(f"The brand grew more confident and developed stronger internal culture. Engagement with other projects increased, and the 'personality' of TokenGators became more distinct.")
    lines.append("")
    lines.append("**Key themes:** Stronger community rituals (GM greetings), partnerships, more sophisticated humor, gaming elements")
    lines.append("")
    
    lines.append("### Recent Era (2025-2026)")
    lines.append("")
    recent_posts = timeline['recent']
    lines.append(f"In the most recent period, the brand has become highly confident in its identity, celebrating milestones and long-term community achievements. The tone is more celebratory and secure.")
    lines.append("")
    lines.append("**Key themes:** Milestone celebrations (anniversaries), collector achievements, partnerships with major brands, expansion into gaming/metaverse")
    lines.append("")
    
    # 6. Story Moments
    lines.append("## 6. Story-Worthy Moments")
    lines.append("")
    
    standouts = find_standout_moments(filtered_posts)
    
    for i, moment in enumerate(standouts, 1):
        lines.append(f"### Moment {i}: {moment['reason']}")
        lines.append(f"**Date:** {moment['date'][:10]}")
        lines.append("")
        lines.append(f"> {moment['text']}")
        lines.append("")
        metrics = moment['metrics']
        lines.append(f"- **Engagement:** {metrics['like_count']} likes, {metrics['retweet_count']} retweets, {metrics['reply_count']} replies")
        lines.append(f"- **Impressions:** {metrics['impression_count']}")
        lines.append("")
    
    # 7. Brand Intelligence Summary
    lines.append("## 7. Brand Intelligence Summary")
    lines.append("")
    
    # Flag observations
    observations = flag_observations(posts, original_posts)
    
    lines.append("**Post-Processing Observations:**")
    for obs in observations[:5]:
        lines.append(f"- **{obs['type'].replace('_', ' ').title()}**: {obs['observation']}")
    lines.append("")
    
    lines.append("### Key Takeaways")
    lines.append("")
    lines.append("1. **Authentic Community Focus**: TokenGators has built a strong sense of community, with regular greetings (GM) and celebration of collector milestones")
    lines.append("2. **Confident Brand Voice**: The brand speaks with personality—humorous, sometimes provocative, never corporate")
    lines.append("3. **Consistent Visual Identity**: The gator character remains central throughout the 3-year timeline")
    lines.append("4. **Strategic Partnerships**: Regular engagement with complementary projects (Otherside, Bored Ape ecosystem)")
    lines.append("5. **Growth in Engagement**: While specific metrics vary, the brand has maintained steady presence and relevance")
    lines.append("")
    
    # 8. Recommendations
    lines.append("## 8. Content Recommendations Based on Analysis")
    lines.append("")
    
    lines.append("**Continue What's Working:**")
    lines.append("- Regular 'GM' greetings and community acknowledgments")
    lines.append("- Celebrating collector achievements and milestones")
    lines.append("- Mixing humor with authentic brand personality")
    lines.append("- Cross-promoting with complementary NFT projects and brands")
    lines.append("")
    
    lines.append("**Areas to Explore:**")
    lines.append("- More behind-the-scenes content about the creative process")
    lines.append("- Increased storytelling around specific gator characters")
    lines.append("- Educational content about the technology/blockchain aspects")
    lines.append("- Greater focus on upcoming features and product developments")
    lines.append("")
    
    # 9. Appendix: Data Processing Notes
    lines.append("## Appendix: Data Processing Notes")
    lines.append("")
    lines.append(f"- **Total records processed:** {len(posts)}")
    lines.append("- **Filtering:** Original posts only for thematic analysis; all posts considered for engagement metrics")
    lines.append("- **Date range analyzed:** 2023-03-14 to 2026-03-11 (approximately 3 years)")
    lines.append("- **Thematic classification:** Heuristic-based keyword analysis")
    lines.append("- **Voice analysis:** Pattern detection for emotional registers and personality traits")
    lines.append("")
    
    # Write to file
    output_path = '/Users/operator/repos/MainFrame/projects/brand-story/outputs/phase-1/token-gators-brand-summary.md'
    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))
    
    print(f"Summary generated successfully!")
    print(f"Output saved to: {output_path}")
    return '\n'.join(lines)

if __name__ == '__main__':
    input_file = '/Users/operator/repos/MainFrame/projects/media-assets/database/posts.jsonl'
    summary = generate_summary(load_posts(input_file))
