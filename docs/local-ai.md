# Local AI help (optional)

Zen Dojo can use an AI model that runs on your own computer to explain a hint, review your code or explain a solution.
It is off until you turn it on in Settings > Local AI (optional). It does not exist on the hosted site.

## What leaves your computer

Nothing. The app talks only to Ollama on `127.0.0.1:11434` (or `localhost`). A non-loopback address is refused.
Only the problem text and your own saved code go to Ollama. Prompts and answers are not logged or stored. There is no telemetry.
Downloading a model is done by Ollama itself, from Ollama's servers, when you press Download.

## Set it up

1. Install Ollama from https://ollama.com/download and start it.
2. In Settings, open Local AI (optional) and press Check again. It should say "Ollama is running".
3. Turn on local AI help, pick a model (the suggested one fits your memory) and press Download.
4. Open a Run-button problem. A collapsed "Ask local AI" panel appears under the editor.

"Explain this hint" and "Review my code" guide you with questions and never include the reference solution.
"Explain the solution" is a separate button and does show it. "Review my code" uses the code saved in the Notes tab.

## Memory guidance

With a graphics card the card's memory counts. Without one, about 60% of your RAM can be used.

| Usable memory | Model |
|---|---|
| 2 GB | llama3.2:3b |
| 6 GB | qwen2.5-coder:7b |
| 12 GB | qwen2.5-coder:14b |
| 20 GB | qwen2.5-coder:32b |

Smaller is always fine. Without a graphics card, long answers are slow.

## Settings: who answers

Settings > Local AI has an **Answers from** list. It shows **This computer (Ollama)** (the default) and, if found on this computer, Claude Code, Antigravity, Gemini CLI and Codex CLI.

- A cloud tool cannot be chosen until you tick its box ("I understand my problem text and code go to ..."). Each has a **Test** button that sends the word "ping" and shows the reply or the error.
- To remove consent, untick the box. If that tool was in use, answers go back to Ollama.
- The choice (`ai_provider`) and the ticked boxes (`ai_cloud_consent`) are device-specific settings. They never sync to other devices. The server checks the consent on every request, not only the UI.
- The model picker and download appear only while Ollama is the chosen source.

## How the AI tools are started, and the flags (checked 2026-11-11)

Code: `apps/web/lib/ai/providers/`. Every tool is started by the same runner (`cli.ts`): no shell, a fixed argument list written in
code, the prompt sent on **stdin only**, an empty temporary folder as the working folder (deleted afterwards), a 120 s timeout, a
200 KB output cap, and the whole process tree is killed on Stop, timeout or cap. Arguments, prompts and answers are never logged.
On Windows a `.cmd` shim (npm-installed tools) runs as `cmd.exe /d /s /c "<path>" <fixed args>`; the path comes from `where.exe`.

| Tool | Status | Fixed arguments (prompt on stdin) | Output |
|---|---|---|---|
| Claude Code (`claude`) | verified here, 2026-11-11 (real run, reply "pong") | `-p --no-session-persistence --tools "" --strict-mcp-config --disable-slash-commands --setting-sources "" --output-format stream-json --include-partial-messages --verbose` | streamed (text deltas from stream-json) |
| Antigravity (`agy`) | **not offered**, checked 2026-11-11 | none | none |
| Gemini CLI (`gemini`) | **unverified** (not installed here) | `--approval-mode plan -p "Answer the conversation given on standard input."` | plain text as it arrives |
| Codex CLI (`codex`) | **unverified** (not installed here) | `exec --sandbox read-only --skip-git-repo-check -` | plain text as it arrives |

- **Claude Code:** `--tools ""` removes every built-in tool (the run's init line shows `"tools":[]`), so it cannot edit files or run commands;
  `--strict-mcp-config` with no config loads no MCP servers; `--setting-sources ""` loads no user or project settings or hooks.
  `stream-json` needs `--verbose` with `-p`.
- **Antigravity:** not offered. Its `-p` takes the prompt as its argument and ignores stdin (the prompt would go in argv), and there is no flag
  that turns its tools off. With `--mode plan --sandbox` in an empty folder it still ran shell commands (`dir`, `git status`) and it lists file-write
  and browser tools. Plan 0067 says a tool that cannot be restricted is not offered. Revisit if a future version adds a chat-only mode.
- **Gemini CLI and Codex CLI:** the flags above are the documented non-interactive modes, not checked on this machine. If a flag is wrong
  the command fails, the Test button shows the error, and the tool is simply not selectable. Their read-only modes are the best restriction
  those tools document; check the Test result and the tool's own docs before relying on them for sensitive code.

## Remove a model

Turn the switch off in Settings to hide all AI features. To free disk space run `ollama rm <model>`, for example `ollama rm llama3.2:3b`.

## Answers can be wrong

Small local models are weak and sometimes confidently wrong. Treat the answer as a nudge and check it against the tests.
