# Woordkracht 🇳🇱

A Dutch vocabulary learning app — built for people preparing for the NT2 exam (Nederlands als Tweede Taal) and anyone living in, or moving to, the Netherlands.

**Live site:** [woordkracht.netlify.app](https://woordkracht.netlify.app)

## Features

- **1577 words**, spanning all 6 CEFR levels from A1 to C2
- **4-language interface**: Dutch, English, Turkish, Arabic (with full RTL support)
- **Flashcards** — spaced-repetition review system
- **Quiz Mode** — multiple choice, 4 difficulty levels
- **Writing Practice** — active recall test with accent-tolerant checking
- **Opposites** — 54 verified antonym pairs
- **Grammar** — 10 topics, 50 practice questions (de/het, tenses, sentence structure)
- **AI Dictionary** — Claude-powered lookup for any word not in the curated list
- **Live weather** — Buienradar integration
- **NT2 exam reminder** with real, curated Dutch resource links (news, dictionaries, job boards, etc.)
- **Progress tracking** — streaks, daily usage time, milestone badges
- **PWA** — installable to the home screen on mobile
- Dark/light mode, backup & restore, favorites

## Tech Stack

A single-file static app (`index.html` — plain HTML/CSS/JS, no framework) plus two Netlify Functions:

```
├── index.html                      # The entire app (frontend)
├── manifest.json                   # PWA manifest
├── sw.js                           # Service worker (offline support)
├── icons/                          # App icons
├── netlify.toml                    # Netlify config + security headers
└── netlify/functions/
    ├── dictionary.js               # AI Dictionary — Anthropic API proxy
    └── weather.js                  # Buienradar weather proxy
```

## Setup / Deploy

Connected to Netlify, so every `git push` deploys automatically.

**Required environment variable** (Netlify → Environment variables):
```
ANTHROPIC_API_KEY=sk-ant-...
```
Without this, the AI Dictionary feature won't work (the rest of the site is unaffected).

For local development, use the Netlify CLI:
```
npm install -g netlify-cli
netlify dev
```

## Notes

- The `AI_DICTIONARY_ENABLED` constant (in `index.html`) toggles the feature on/off — keep it `false` until a payment system is set up.
- Vocabulary data (the `VOCAB` array) and grammar topics (`GRAMMAR_TOPICS`) are defined directly inside `index.html`.
