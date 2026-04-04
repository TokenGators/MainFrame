# Gatorpedia Tag Taxonomy v1.0

Tags are **flat, lowercase, hyphenated**. Assets can have multiple tags.

**Rules:**
- All AI tagging must draw exclusively from this list
- New tags require human approval before use — add proposals to `TAXONOMY-PROPOSALS.md`
- Tier 1 tags are set automatically from asset type — do not apply manually
- Tier 4 (tone) tags are provisional — all AI-assigned tone tags require human review

---

## Tier 1 — Content Format

*Set automatically by asset type. Not applied manually or by AI.*

| Tag | Description |
|-----|-------------|
| `tweet` | Twitter/X post |
| `video` | Video asset |
| `image` | Static image |
| `gif` | Animated GIF |
| `article` | Written article or document |
| `audio` | Audio asset |

---

## Tier 2 — Product / Topic

*What is this asset about?*

| Tag | Description |
|-----|-------------|
| `wearables` | Clothing, fashion drops, merch |
| `lore` | Narrative, world-building, story content |
| `canon` | Canon story content |
| `characters` | Specific gator characters, personality content |
| `community` | GM/GN posts, fan engagement, community moments |
| `partnerships` | Collabs with other brands or projects |
| `collab` | Collaboration content |
| `announcements` | Drops, launches, product reveals |
| `nft` | NFT-specific content |
| `nft-collection` | Content about the NFT collection itself |
| `gator-character` | Content featuring a specific named/numbered gator |
| `token` | $TG token, crypto/DeFi content |
| `otherside` | Otherside/metaverse content |
| `SuperTripLand` | SuperTripLand content |
| `Geez` | Geez content |
| `humor` | Memes, jokes, comedy content |
| `meme` | Memes or content based on memes |
| `satire` | Parody, mock-ads (FOAM-O, Kal-Buck, etc.) |
| `foam-hat` | Content featuring foam gator hats |
| `brand-campaigns` | Named campaign content |
| `foam-o` | FOAM-O product universe |
| `gator-blaster` | Gator Blaster 67 product universe |
| `pixel-pals` | Pixel Pals / Swap Shrinkers content |
| `delegators` | DeleGators / Spotlight voting content |
| `gtv` | GTV channel content |
| `art` | Digital art, NFT artwork showcases |
| `music` | Death Roll band, music content |
| `gaming` | Game-related content, Super Trip, etc. |
| `education` | Informational, how-to content |
| `behind-the-scenes` | Production content, making-of |

---

## Tier 3 — Campaign / Season

*Time-bounded campaigns and drops. Apply when content clearly belongs to a specific campaign.*

| Tag | Description |
|-----|-------------|
| `launch` | NFT Collection launch |
| `return-to-swamp` | Return to Swamp launch |
| `spotlight-s2` | Spotlight Season 2 |
| `halloween-2024` | Halloween 2024 campaign |
| `christmas` | Christmas / holiday content |
| `fourth-of-july` | Independence Day content |
| `mothers-day` | Mother's Day content |
| `spring-2026` | Spring 2026 season |

---

## Tier 4 — Tone / Classification

*How the content communicates. Used by the brand analysis classifier. All AI-assigned tone tags are provisional and require human review.*

| Tag | Description |
|-----|-------------|
| `lore-storytelling` | High narrative/character value |
| `product-gameday` | Product or event promotion |
| `allowlists` | Allowlist promos, generic drops (low signal) |
| `cinematic` | High production value visual content |
| `playful` | Light, fun, casual |
| `confident` | Bold, declarative, power content |
| `authentic` | Raw, unfiltered, community-feel |
| `viral-potential` | High engagement, shareable |

---

## Adding New Tags

1. Add your proposed tag to `TAXONOMY-PROPOSALS.md` with a justification
2. Human approves → move to this file under the appropriate tier
3. Once in this file, the tag is available for AI tagging jobs

Do **not** add tags directly to this file without the proposal process.
