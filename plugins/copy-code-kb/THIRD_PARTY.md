# Third-party code

This mod started from the copy-code mod by AH-Merii (AbdulHamid Merii), MIT:
https://github.com/AH-Merii/claude-plugins (plugins/copy-code). Two parts of its code were adapted:

- `hooks/split.ts`: the fence splitting and the language aliases (its split.ts and languages.ts).
- `hooks/register.tsx`: the plain-text re-copy through `wl-copy` after Claude Code's own copy, with its argv, output redirection and timing.

The idea of a copy button on code blocks, the Biome settings and the layout of the checks and CI workflow follow the same repository.

MIT License

Copyright (c) 2026 AH-Merii (AbdulHamid Merii)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
