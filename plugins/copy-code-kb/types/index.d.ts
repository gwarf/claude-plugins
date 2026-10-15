// One fenced code block of the last reply, as the band and /cc see it.
export type Block = { code: string; language?: string; lines: number }

declare module 'claude-code' {
  interface PluginState {
    'copy-code-kb': { blocks: Block[] }
  }
}
