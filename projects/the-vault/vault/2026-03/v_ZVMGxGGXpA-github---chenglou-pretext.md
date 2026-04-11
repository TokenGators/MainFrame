---
id: v_ZVMGxGGXpA
url: https://github.com/chenglou/pretext
title: GitHub - chenglou/pretext
category: Dev
tags: ['JavaScript', 'Performance', 'Web Development', 'UI Library']
saved_at: 2026-03-30T07:46:53.951000
saved_by: 
read_time: 6 min
---

# GitHub - chenglou/pretext

## Summary
This article introduces Pretext, a pure JavaScript/TypeScript library designed for efficient multiline text measurement and layout without triggering expensive DOM reflows. It bypasses traditional browser methods by implementing custom logic using the browser's font engine, resulting in significantly faster performance for text-heavy applications. The library supports diverse languages, emojis, and mixed-bidi text while enabling rendering to DOM, Canvas, SVG, and WebGL. Ultimately, it empowers developers to create optimized virtualization, masonry layouts, and responsive UIs that prevent layout shifts without relying on CSS hacks.

## Key Points
- Avoids expensive DOM reflows by using custom text measurement logic instead of getBoundingClientRect
- Delivers high performance with layout calculations taking approximately 0.09ms for large batches
- Supports all languages including emojis and mixed-bidi text across various rendering targets
- Enables advanced UI patterns like virtualization, masonry layouts, and shrink-wrapping containers
- Provides APIs for both simple height calculations and granular line-by-line layout control

## Source
https://github.com/chenglou/pretext
