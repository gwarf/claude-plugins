// copy-code-kb: copy a fenced block of the last reply from the keyboard, on the main screen.
// Fence splitting adapted from AH-Merii/claude-plugins copy-code (MIT, see THIRD_PARTY.md).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface } from 'claude-code'

import type { Block } from '../types'
import { blocks as splitBlocks, languageName } from './split'

const COMMAND = 'cc'
// Digit hotkeys reach 1-9; later blocks stay reachable through /cc n.
const HOTKEYS = 9
// A bare index, or nothing: Number() and parseInt would accept "", "2abc", "1e1".
const INDEX = /^\s*([1-9]\d*)?\s*$/
// Copies stdin as plain text. Claude Code's own wl-copy lets it guess the type, so a one-letter block lands as
// octet-stream. Output to /dev/null: the clipboard daemon wl-copy leaves running would hold the pipes open.
const WL_COPY = ['sh', '-c', "exec wl-copy --type 'text/plain;charset=utf-8' >/dev/null 2>&1"]
const WL_COPY_MS = 2000
// Claude Code's own wl-copy lands shortly after its copy call returns; the typed one waits so it lands last.
const WL_COPY_AFTER_MS = 300

const blocks = atom({ plugin: 'copy-code-kb', key: 'blocks' } as const, [])

const describe = (block: Block, index: number, count: number) =>
  `block ${index}/${count} (${languageName(block.language)}, ${block.lines} ${block.lines === 1 ? 'line' : 'lines'})`

// Claude Code's copy first (its result is what the answer says), then on Wayland and not over SSH the plain-text
// re-copy; when wl-copy is missing or fails, Claude Code's copy stands.
async function copy($: EngineInterface, block: Block, surface?: RenderSurface) {
  const result = await $.ui.copy(surface === undefined ? { text: block.code } : { text: block.code, surface })
  if (result.isCopied && (await $.env.get('WAYLAND_DISPLAY')) && !(await $.env.get('SSH_CONNECTION'))) {
    await $.clock.sleep(WL_COPY_AFTER_MS)
    await $.process.run(WL_COPY, { stdin: block.code, timeoutMs: WL_COPY_MS }).catch(() => undefined)
  }
  return result
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Copy a code block of the last reply: /cc copies the last one, /cc 2 the second.',
    })
    return next(e)
  })

  // A new prompt means the reply on screen is no longer the last one, even when its turn gets interrupted.
  on('prompt.submit', async ($, e, next) => {
    await update($, blocks, () => [])
    return next(e)
    // A failure here must never drop the prompt: next(e) replays a call already made, else passes it on.
  }).catch((_$, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    // A subagent's turn ends on the same hook; only the main loop's reply is "the last reply".
    if (e.agentId === undefined) {
      const found = splitBlocks(e.answer)
      await update($, blocks, () => found)
    }
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const list = await read($, blocks)
    if (list.length === 0) {
      return { text: 'No code block in the last reply.' }
    }
    const match = INDEX.exec(e.args)
    if (match === null) {
      return { text: `Usage: /cc [n], n from 1 to ${list.length}.` }
    }
    const index = match[1] === undefined ? list.length : Number(match[1])
    const block = list[index - 1]
    if (block === undefined) {
      return { text: `No block ${index}: the last reply has ${list.length}.` }
    }
    const result = await copy($, block)
    return {
      text: result.isCopied ? `Copied ${describe(block, index, list.length)}.` : `Copy failed: ${result.reason}.`,
    }
  }).catch(() => ({ text: 'Copy failed: copy-code-kb hit an error.' }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, blocks)
    if (list.length === 0 || e.props.hasSurvey || e.props.isWorking) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const shown = list.slice(0, HOTKEYS)
    const rest = list.length - shown.length

    return (
      <Box flexDirection="row" flexWrap="wrap">
        <Box marginRight={1}>
          <Text dimColor>copy</Text>
        </Box>
        {shown.map((block, i) => (
          <Box key={`copy:${i + 1}`} marginRight={2}>
            <Button
              key={`copy:${i + 1}`}
              plain
              hotkey={String(i + 1)}
              label={`${languageName(block.language)} ${block.lines}L`}
              onPress={async press => {
                try {
                  const result = await copy($, block, press.surface)
                  $.ui.toast(result.isCopied ? `Copied ${describe(block, i + 1, list.length)}` : `Copy failed: ${result.reason}`)
                } catch {
                  $.ui.toast('Copy failed: copy-code-kb hit an error')
                }
              }}
            />
          </Box>
        ))}
        {rest > 0 && <Text dimColor>+{rest} more: /cc n</Text>}
      </Box>
    )
  })
}
