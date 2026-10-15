import type { CommandRunInput, On, TurnCompleteInput } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

import { blocks, languageName } from './split'

const PLUGIN = 'copy-code-kb'

const REPLY = [
  'Run this:',
  '```bash',
  'echo one',
  '```',
  'then this, indented in a list:',
  '  ```py',
  '  print(1)',
  '  print(2)',
  '  ```',
  'and an untagged one:',
  '````',
  'has ``` inside',
  '````',
].join('\n')

const turn = (answer: string, agentId?: string): TurnCompleteInput => ({
  answer,
  durationMs: 10,
  isAborted: false,
  turnId: 't1',
  reason: 'answer',
  ...(agentId === undefined ? {} : { agentId }),
})

const run = (args: string): CommandRunInput => ({
  command: 'cc',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
})

// The engine's own answers beneath the plugin, which the kit leaves to the test.
const bottom = (on: On) => {
  // No WAYLAND_DISPLAY: the wl-copy re-copy never runs in a test.
  mock.env(on, {})
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

const BAND = {
  plugin: PLUGIN,
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 5,
    bodyColumns: 75,
    scroll: { offset: 0, bodyRows: 5 },
    view: {},
  },
} as const

describe('split', () => {
  test('finds fences, strips list indent, keeps inner backticks', () => {
    const found = blocks(REPLY)
    expect(found.map(b => b.code)).toEqual(['echo one', 'print(1)\nprint(2)', 'has ``` inside'])
    expect(found.map(b => b.language)).toEqual(['bash', 'py', undefined])
    expect(found.map(b => b.lines)).toEqual([1, 2, 1])
  })

  test('tilde fences, CRLF, unclosed fence, info string with options', () => {
    expect(blocks('~~~json\r\n{}\r\n~~~\r\n').map(b => b.code)).toEqual(['{}'])
    expect(blocks('```ts\nopen').map(b => b.code)).toEqual(['open'])
    expect(blocks('```bash title=x\nls\n```')[0]?.language).toBe('bash')
    expect(blocks('no code here')).toEqual([])
  })

  test('language names', () => {
    expect(languageName('py')).toBe('python')
    expect(languageName(undefined)).toBe('text')
    expect(languageName('constructor')).toBe('constructor')
  })
})

describe('/cc', () => {
  test('copies the last block by default, the nth by index', async ($, on) => {
    bottom(on)
    const copied: string[] = []
    on('ui.copy', (_$, e) => {
      copied.push(e.text)
      return { value: { isCopied: true } }
    })
    await $.turn.complete(turn(REPLY))

    expect((await $.command.run(run(''))).text).toBe('Copied block 3/3 (text, 1 line).')
    expect((await $.command.run(run(' 2 '))).text).toBe('Copied block 2/3 (python, 2 lines).')
    expect(copied).toEqual(['has ``` inside', 'print(1)\nprint(2)'])
  })

  test('refuses a bad index without copying', async ($, on) => {
    bottom(on)
    const copied: string[] = []
    on('ui.copy', (_$, e) => {
      copied.push(e.text)
      return { value: { isCopied: true } }
    })
    await $.turn.complete(turn(REPLY))

    expect((await $.command.run(run('7'))).text).toBe('No block 7: the last reply has 3.')
    for (const bad of ['0', '-1', '02', '2abc', '1e1', '2 3']) {
      expect((await $.command.run(run(bad))).text).toBe('Usage: /cc [n], n from 1 to 3.')
    }
    expect(copied).toEqual([])
  })

  test('says so when the last reply has no block, after a reply or a new prompt', async ($, on) => {
    bottom(on)
    const copied: string[] = []
    on('ui.copy', (_$, e) => {
      copied.push(e.text)
      return { value: { isCopied: true } }
    })
    await $.turn.complete(turn(REPLY))
    await $.turn.complete(turn('prose only'))
    expect((await $.command.run(run(''))).text).toBe('No code block in the last reply.')

    await $.turn.complete(turn(REPLY))
    await $.prompt.submit({ text: 'next question', wait: false, origin: { kind: 'composer' } })
    expect((await $.command.run(run(''))).text).toBe('No code block in the last reply.')
    expect(copied).toEqual([])
  })

  test('reports a copy the surface refused', async ($, on) => {
    bottom(on)
    on('ui.copy', () => ({ value: { isCopied: false, reason: 'no-clipboard' } }))
    await $.turn.complete(turn(REPLY))
    expect((await $.command.run(run(''))).text).toBe('Copy failed: no-clipboard.')
  })

  test("a subagent's turn does not replace the main reply's blocks", async ($, on) => {
    bottom(on)
    on('ui.copy', () => ({ value: { isCopied: true } }))
    await $.turn.complete(turn(REPLY))
    await $.turn.complete(turn('```sh\nrm -rf nope\n```', 'agent-1'))
    expect((await $.command.run(run(''))).text).toBe('Copied block 3/3 (text, 1 line).')
  })
})

describe('wl-copy re-copy', () => {
  const RUN_OK = { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }

  // The engine's answers beneath the plugin, with the environment the test names and a held clock.
  const wayland = (on: On, variables: Record<string, string>) => {
    mock.env(on, variables)
    on('turn.complete', (_$, e) => ({ text: e.answer }))
    on('ui.copy', () => ({ value: { isCopied: true } }))
    return mock.clock(on)
  }

  test('on Wayland the body goes to wl-copy on stdin after the copy', async ($, on) => {
    const clock = wayland(on, { WAYLAND_DISPLAY: 'wayland-0' })
    const runs: { argv: readonly string[]; stdin?: string }[] = []
    on('process.run', (_$, e) => {
      runs.push({ argv: e.argv, stdin: e.init?.stdin })
      return { value: RUN_OK }
    })
    await $.turn.complete(turn(REPLY))

    const answer = $.command.run(run('1'))
    await clock.settle()
    await clock.advance(300)
    expect((await answer).text).toBe('Copied block 1/3 (bash, 1 line).')
    expect(runs).toEqual([
      { argv: ['sh', '-c', "exec wl-copy --type 'text/plain;charset=utf-8' >/dev/null 2>&1"], stdin: 'echo one' },
    ])
  })

  test('over SSH nothing is spawned', async ($, on) => {
    wayland(on, { WAYLAND_DISPLAY: 'wayland-0', SSH_CONNECTION: '10.0.0.1 2 10.0.0.2 22' })
    let runs = 0
    on('process.run', () => {
      runs += 1
      return { value: RUN_OK }
    })
    await $.turn.complete(turn(REPLY))
    expect((await $.command.run(run('1'))).text).toBe('Copied block 1/3 (bash, 1 line).')
    expect(runs).toBe(0)
  })

  test("a failing wl-copy leaves Claude Code's copy standing", async ($, on) => {
    const clock = wayland(on, { WAYLAND_DISPLAY: 'wayland-0' })
    on('process.run', () => {
      throw new Error('wl-copy: command not found')
    })
    await $.turn.complete(turn(REPLY))

    const answer = $.command.run(run('1'))
    await clock.settle()
    await clock.advance(300)
    expect((await answer).text).toBe('Copied block 1/3 (bash, 1 line).')
  })
})

describe('band', () => {
  test('one hotkey Button per block, a press copies it', async ($, on) => {
    bottom(on)
    const copied: string[] = []
    on('ui.copy', (_$, e) => {
      copied.push(e.text)
      return { value: { isCopied: true } }
    })
    await $.turn.complete(turn(REPLY))

    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const buttons = await ui.findAll({ type: 'Button' })
    expect(buttons.map(b => b.props.hotkey)).toEqual(['1', '2', '3'])
    expect(buttons.map(b => b.props.label)).toEqual(['bash 1L', 'python 2L', 'text 1L'])

    await ui.press({ key: 'copy:2' })
    expect(copied).toEqual(['print(1)\nprint(2)'])
    await ui.unmount()
  })

  test('yields with no blocks, while working, and under a survey', async ($, on) => {
    bottom(on)
    await $.turn.complete(turn('prose only'))
    const empty = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await empty.find({ type: 'Button' })).toBeUndefined()
    await empty.unmount()

    await $.turn.complete(turn(REPLY))
    for (const props of [
      { ...BAND.props, isWorking: true },
      { ...BAND.props, hasSurvey: true },
    ]) {
      const ui = await $.ui.mount({ ...BAND, props, surface: 'terminal' })
      expect(await ui.find({ type: 'Button' })).toBeUndefined()
      await ui.unmount()
    }
  })

  test('caps the hotkeys at nine and points past them', async ($, on) => {
    bottom(on)
    const many = Array.from({ length: 11 }, (_, i) => `\`\`\`\nblock ${i + 1}\n\`\`\``).join('\n')
    await $.turn.complete(turn(many))
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(9)
    expect(await ui.find({ type: 'Text', text: /\+2 more/ })).toBeDefined()
    await ui.unmount()
  })
})
