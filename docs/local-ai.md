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

## Remove a model

Turn the switch off in Settings to hide all AI features. To free disk space run `ollama rm <model>`, for example `ollama rm llama3.2:3b`.

## Answers can be wrong

Small local models are weak and sometimes confidently wrong. Treat the answer as a nudge and check it against the tests.
