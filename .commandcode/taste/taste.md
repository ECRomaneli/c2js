# Taste

- Wants c2js templates implemented with only `c2-*` attributes and CSS — no custom JavaScript files (corrected the assistant after it wrote `script.js`, prompting its removal). Confidence: 0.75
- For template/theme variants (e.g. a "modern" version of an existing template), wants the existing HTML reused verbatim and only the CSS swapped — not a newly authored markup structure. Confidence: 0.6
- Prefers each template folder to be self-contained: its own assets (video, icons, license) copied into `templates/<name>/assets/` and referenced as `assets/...`, instead of a shared sibling `templates/assets/` folder ("não faz sentido ficar do lado de fora"). Confidence: 0.7
- For mobile/touch UIs, wants primary controls large and kept together in an organized cluster so a finger can hit them; rejects controls scattered/spread across the screen ("ficou tudo semeado pela tela"). Confidence: 0.65
- When asking for existing code to be modernized/refactored, expects scope to stay strictly behavior-preserving: no features removed and none added — including interaction/visual behavior such as which element a hover reveals a control bar (flagged the changed hover trigger as "opacity not working") and no extra timer-based auto-hide when a plain hover show/hide was meant. Confidence: 0.78
