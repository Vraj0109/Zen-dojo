# Zen Dojo: help and FAQ

<!-- Generated from apps/web/lib/faq.ts by `pnpm faq:build`. Edit that file, not this one. -->

The same text is in the app at `/help`. Where something could not be confirmed, the answer says Not verified.

## Contents

- [Install and update](#install-and-update)
- [macOS problems](#macos-problems)
- [Windows problems](#windows-problems)
- [Linux](#linux)
- [Code compilers and tools](#code-compilers-and-tools)
- [Running code](#running-code)
- [AI and models](#ai-and-models)
- [Accounts and sync](#accounts-and-sync)
- [Hosted site and phone](#hosted-site-and-phone)
- [Buddy and pets](#buddy-and-pets)
- [Portfolio and public profile](#portfolio-and-public-profile)
- [Certificates and signing](#certificates-and-signing)
- [Content](#content)
- [Developers](#developers)

## Install and update

_Windows, macOS and Linux, where your data lives, backups, uninstalling and updates._

### How do I install Zen Dojo on Windows?

1. Download the Windows installer (an .exe named like `ZenDojo-<version>-win-x64.exe`) from the newest GitHub release.
2. Run it. The installer lets you choose the install folder.
3. Windows SmartScreen says Windows protected your PC because the installer is not signed with a paid certificate. Choose More info, then Run anyway.

Reading, plans and notes work right away. To use the Run button you also need compilers or runtimes: see the Code compilers and tools section.

### How do I install Zen Dojo on macOS?

1. Download the .dmg from the newest GitHub release. The build is for Apple Silicon (arm64) only; an Intel Mac build does not exist yet.
2. Open the .dmg and drag Zen Dojo to Applications.
3. Open the app. The first time, macOS shows a warning. Follow the steps in the next section (macOS problems).

### How do I install Zen Dojo on Linux?

1. Download the .AppImage from the newest GitHub release. Linux ships as an AppImage only (no .deb).
2. Make it executable: `chmod +x ZenDojo-*.AppImage`.
3. Run it: `./ZenDojo-<version>-linux-x64.AppImage`.

If it does not start, see the Linux section (FUSE and the sandbox error).

### Where does the desktop app keep my data?

In the operating system's app-data folder, not in the install folder. You can open it from the app menu (File, Open data folder).

- Windows: `%APPDATA%\HabitManager`
- macOS: `~/Library/Application Support/HabitManager`
- Linux: `~/.config/HabitManager`

The folder keeps its old name (HabitManager) on purpose, so updating from the old name keeps your data. Inside it: `habit.db` (your progress), `backups/` (automatic copies made before updates), `tools/` (downloaded compilers), `logs/` (server and update logs).

Never edit `habit.db` by hand. To try a build without touching your data, set the environment variable `HABIT_DATA_DIR` to another folder before starting the app.

### How do backups work, and how do I make my own?

Automatic: the first time a new app version starts, it copies `habit.db` into the `backups` folder inside the data folder, before any database change runs. The newest 5 are kept. If an update goes wrong, close the app and copy one of those files back over `habit.db`.

Your own backup: open Profile, Settings, Backup and restore, and choose Download a backup. It is one JSON file with all your progress. Restore from backup in the same place replaces all current data with the file. The backup section does not exist on the hosted website.

Signed-in users also have a cloud copy through sync (see Accounts and sync). That is a convenience copy, not a replacement for a backup file.

### How do I uninstall Zen Dojo?

- Windows: Settings, Apps, Installed apps, Zen Dojo, Uninstall.
- macOS: quit the app and drag Zen Dojo from Applications to the Bin.
- Linux: delete the AppImage file.

Your data folder (see Where does the desktop app keep my data) is a separate folder. The installer settings in the repo do not delete it, so your progress survives an uninstall. Delete the folder yourself if you want everything gone. Not verified: the exact behaviour of the Windows uninstaller on your machine; check that the folder is still there if it matters.

If you were signed in, uninstalling does not delete your cloud copy. Use Delete cloud data first (see Accounts and sync).

### How does updating work on each system?

The installed app checks GitHub releases about 10 seconds after it starts and then every 6 hours. You can also use Help, Check for updates. Development builds do not update.

- Windows: the update downloads in the background. Then a box asks Restart now or Later. Later installs it the next time you quit.
- Linux (AppImage): the same as Windows. A copy that is not run as an AppImage only gets a message pointing to the releases page.
- macOS: no automatic install. The app tells you a new version exists and opens the release page; you download the new .dmg and drag it to Applications. Installing updates needs a paid Apple Developer ID certificate (see Certificates and signing). Your data stays where it is.

Your data is backed up before each new version's first start (see backups). Setting the environment variable `HABIT_NO_UPDATES` turns the checks off.

## macOS problems

_The Gatekeeper warning, the C++ header error and Xcode command line tools._

### macOS says "Zen Dojo not opened: Apple could not verify it is free of malware". What do I do?

This is expected. The app is not notarized by Apple yet (that needs a paid Apple Developer account). It is not a sign of damage. On macOS 15 (Sequoia) and newer:

1. Click Done in the warning. Do not click Move to Bin.
2. Open System Settings, then Privacy & Security.
3. Scroll down to the Security section. Next to the message about Zen Dojo, click Open Anyway.
4. Confirm with your password or Touch ID, then open the app again.

On macOS 14 and older you can instead right-click the app and choose Open. On macOS 15 and newer right-click, Open no longer works; use the steps above.

### Is there a Terminal shortcut for the Gatekeeper warning?

Yes. It works on every macOS version. It removes the quarantine mark that the download added:

```
xattr -dr com.apple.quarantine "/Applications/Zen Dojo.app"
```

Then open the app again. This only affects the Zen Dojo app you point it at.

### C++ fails on macOS with "bits/stdc++.h file not found". Why, and what does the app do now?

Cause: on a Mac, `g++` is really Apple's clang. Its C++ library has no `bits/stdc++.h`, a GCC-only header that includes the whole standard library. The judge and most competitive-programming code use it.

What the app does (since 0.8.0): when it detects clang, the judge writes a stand-in `bits/stdc++.h` next to your program and adds it to the include path, so the common case compiles. The stand-in includes the standard C++17 headers that clang also has.

If you still see a setup message, the Results panel says it is a setup problem, not your code, and links to Settings, Tools for running code. Make sure the Xcode command line tools are installed (next question) and update Zen Dojo.

### How do I install the Xcode command line tools (a C++ compiler on macOS)?

1. Open Profile, Settings, Tools for running code and press the button on the C++ card. It runs `xcode-select --install`, which opens Apple's own installer window.
2. Or run it yourself in Terminal: `xcode-select --install`.
3. Accept the licence and wait for the download. Then press Check again in the app.

The app does not download a C++ compiler on macOS; it uses Apple's. Java and Python can be downloaded by the app.

## Windows problems

_SmartScreen, Smart App Control and Python._

### Windows says "Windows protected your PC" (SmartScreen). Is it safe to continue?

The installer is not signed with a paid code-signing certificate, so SmartScreen has no publisher to trust and warns. Download only from the project's GitHub releases page. Then:

1. In the blue box choose More info.
2. Choose Run anyway.

Even a signed installer from a new publisher can show this warning until enough people have installed it. See Certificates and signing.

### C++ fails on Windows 11 with "spawn UNKNOWN" or "spawn EPERM". What is happening?

Windows 11 Smart App Control (or strict Defender reputation protection) refuses to start the temporary `main.exe` that `g++` just built, because it is unsigned and has no reputation. The judge then reports `unavailable`, and the editor shows a banner and switches the language to Java (or JavaScript if Java is missing).

Java runs under the signed `java.exe` and JavaScript under a signed Node, so they are allowed. Your options:

1. Solve in Java, JavaScript or Python. The editor switches automatically and remembers the language per problem.
2. Add an exclusion: Windows Security, Virus & threat protection, Manage settings, Exclusions, and add the app folder or the temporary folder.
3. Or look at Smart App Control settings in Windows Security, App & browser control. Warning: Windows does not let you turn Smart App Control back on after you turn it off, unless you reinstall Windows.

The problem is with the programs the compiler makes, not with the compiler. Not verified here: whether Python is affected. Python runs through `python.exe` (a signed interpreter), so it should behave like Java and Node, but this has not been tested on a Smart App Control machine.

### Python is not found on Windows, or the wrong Python is used. How do I fix it?

The app looks for Python 3 in this order: the `HABIT_PYTHON` environment variable if it is set (it is then the only candidate); on Windows `py -3`, then `python`. A Python 2 is ignored.

The fake `python.exe` that Windows installs, which only opens the Microsoft Store, counts as missing.

1. Install Python 3: `winget install Python.Python.3.12`. Or let the app download a portable Python (Settings, Tools for running code).
2. To force one specific Python, set `HABIT_PYTHON` to its full path, for example in PowerShell: `setx HABIT_PYTHON "C:\Python312\python.exe"`.
3. Close the app completely and start it again so it sees the change, then press Check again in Settings, Tools for running code.

Other overrides work the same way: `HABIT_GPP`, `HABIT_JAVAC`, `HABIT_JAVA`, `HABIT_NODE`.

## Linux

_AppImage, FUSE and the sandbox error._

### The AppImage does nothing when I double-click it.

1. Make it executable: right-click, Properties, Allow executing as a program, or run `chmod +x ZenDojo-*.AppImage`.
2. Start it from a terminal to see any error message: `./ZenDojo-*.AppImage`.

Automatic updates only work when you start the app as an AppImage (the app checks the `APPIMAGE` variable that the AppImage runtime sets).

### The AppImage says it needs FUSE, or fails with a libfuse error.

Not documented in this repo; this is general AppImage behaviour. AppImages mount themselves using FUSE 2, and some newer distributions (for example Ubuntu 22.04 and later) no longer include it by default. Two common fixes:

1. Install FUSE 2. On Ubuntu or Debian the package is `libfuse2` (newer releases name it `libfuse2t64`): `sudo apt install libfuse2`.
2. Or run without FUSE: `./ZenDojo-*.AppImage --appimage-extract-and-run`.

Not verified on this project's AppImage: both options are standard AppImage features, but they have not been tested here.

### The AppImage exits with a "SUID sandbox" error (Ubuntu 24.04 and newer).

Newer Ubuntu releases restrict the unprivileged user namespaces that Electron's sandbox uses. The project's documented workaround is to start the AppImage with `--no-sandbox`:

```
./ZenDojo-*.AppImage --no-sandbox
```

This turns off a protection layer of the app's window. The app only loads its own local server, but it is a trade-off; the other fix is to change your system's namespace restriction, which is outside this project's docs.

### Sign-in finishes in the browser but never returns to the app on Linux.

Sign-in comes back through the `zendojo://` link, and your desktop must know to open it with the AppImage.

- With AppImageLauncher (or a similar tool) this is set up for you.
- Otherwise create a `.desktop` file (for example in `~/.local/share/applications/`) with `MimeType=x-scheme-handler/zendojo;` and `Exec=/path/to/ZenDojo.AppImage %u`, then run `update-desktop-database ~/.local/share/applications/`.

## Code compilers and tools

_What each language needs and the built-in tool manager._

### What does each language need for the Run button?

- C++: a compiler, `g++` (on macOS this is Apple's clang). The judge uses C++17.
- Java: a JDK (the app's downloadable one is Temurin 17).
- Python: Python 3 (3.9 or newer is needed by the test harness).
- JavaScript: in the desktop app it can run on the app's own runtime, so Node is only needed outside the app or if the built-in runtime is blocked.

Reading, plans, notes and tracking work without any of them. The Run button needs the desktop app: the hosted website cannot run code.

### How do I see what is missing? (Settings, Tools for running code, Check my tools)

1. Open Profile, Settings, then Tools for running code (address `/profile/settings/tools`).
2. Each language card says whether it was found, which program is in use and its version. A missing one shows the install command for your system to copy.
3. After installing something, press Check again. If it is still not found, restart the app so it sees the new PATH.

The Today page also shows a dismissible notice while something is missing.

### What is the portable tool manager, and what does it download?

In the desktop app, each tool card has a Set up button that downloads a portable copy into the app's own data folder. No administrator rights, nothing on your system changes. A confirmation first shows the source, version, download size and disk space; nothing downloads until you press Download. Set up all missing tools does several at once, and Cancel stops a running download and keeps nothing.

- Java: Temurin JDK 17.0.21+9 from Eclipse Adoptium, about 170 to 185 MB download, about 320 MB on disk.
- Python: CPython 3.12.16 (python-build-standalone, install_only build), 24 to 65 MB download, 100 to 250 MB on disk.
- C++ on Windows only: GCC 16.2.0 with MinGW-w64 14.0.0 from WinLibs, about 264 MB download, about 925 MB on disk.
- C++ on macOS: not downloaded; the card button runs `xcode-select --install`.
- C++ on Linux: not downloaded; the card shows your distribution's install command, for example `sudo apt install g++`.

These versions are pinned in the app and were checked on 2026-11-11.

### How do I know the downloads are safe? (SHA-256 checks)

- Only HTTPS, and the address always comes from the app's own catalogue, never from a request. Only the catalogue's host and GitHub's release redirect hosts are allowed, with at most 3 redirects, each one checked.
- The download may not be larger than the listed size plus 5 percent.
- The SHA-256 of the file is verified before anything is unpacked. A mismatch deletes the file and installs nothing.
- The archive's file list is read first; any path outside the target folder is rejected.
- It unpacks into a temporary folder and moves it into place in one step. Any failure removes the partial folder, and the downloaded archive is deleted afterwards.

A checksum message means the file was not what the publisher released; nothing was kept. Check your connection and try again.

### Where are the downloaded tools stored, and how do I remove them?

In `tools/<tool>/<version>/` inside the app data folder, plus `tools/manifest.json`. On Windows that is `%APPDATA%\HabitManager\tools`.

1. To remove one tool, press Remove on its card in Settings, Tools for running code.
2. To remove everything by hand, close the app and delete the `tools` folder.

Which copy is used: your `HABIT_*` environment variable first, then the downloaded copy, then the program on PATH. The card says which one is in use. A new app version may pin a newer tool version; press Remove, then Set up.

### My antivirus quarantined the downloaded compiler.

1. Allow the `tools` folder of the app data folder in your antivirus.
2. In Zen Dojo press Remove on the tool card, then Set up again.

If Windows still blocks the C++ programs you build, that is Smart App Control, a different problem (see Windows problems).

## Running code

_Time limits and why a solution can say Time Limit Exceeded._

### What are the time and size limits when I press Run?

Default time limit per test case, unless a problem sets its own: C++ 1 second, Java 2.5 seconds, JavaScript 4 seconds, Python 5 seconds.

- Compiling may take up to 30 seconds.
- A single run of the normal cases is stopped after 4 seconds; all normal runs together get 15 seconds; the large inputs together get 30 seconds.
- Console output beyond about 1,000,000 characters stops the program. Your code can be up to about 100,000 characters.

These are the limits in the current code (`apps/web/lib/judge/run.ts`) and can change between versions.

### Why does my solution say "Time Limit Exceeded"?

The result says how long the case took and what the limit was. Common causes:

- The algorithm is too slow for the large inputs. The small examples pass, then a large case (labelled as a stress case) fails. Look for a nested loop where a hash map, sorting or two pointers would do.
- An infinite loop, or a loop that never advances.
- Slow input or output: many small prints. Build the output and print once.
- Python is slower than C++, which is why its default limit is higher. A solution that is fine in C++ can still be too slow in plain Python.

After the first Time Limit Exceeded the remaining cases are marked Not run. Test your idea in C++ or Java if you suspect the language, not the algorithm. If a limit looks unfair for a problem, treat it as a bug and note it; do not assume your code is at fault.

### What is different about running Python?

- Your file is a hidden prelude plus your code plus the test harness. The prelude already imports `sys`, `math`, `heapq`, `bisect`, `itertools`, `functools`, `collections` and `random`, so you can use them without importing.
- Python 3.9 or newer is required.
- The time limit per case is 5 seconds by default; there is also a memory limit.
- Python is chosen by the order in the Windows section (`HABIT_PYTHON` first).

Not verified: the exact memory limit in megabytes. It is passed to the harness per problem.

### Results say "setup problem", not my code. What does that mean?

The run failed because of the computer, not your solution: a missing compiler or JDK, a program that is not found, a compiler without a header the judge needs, or a JDK version that does not match. The message links to Settings, Tools for running code. Fix it there, press Check again and run again.

## AI and models

_Local Ollama, AI command line tools, cloud consent and your own API key._

### What AI help does Zen Dojo have, and is it on by default?

It is off until you turn it on in Settings, Local AI (optional). Desktop app: explain a hint, review your code, explain a solution, chat, and the pet's chat. "Explain this hint" and "Review my code" never include the reference solution. "Explain the solution" is a separate button and does show it. Review uses the code saved in the Notes tab.

Small models are sometimes confidently wrong. Treat the answer as a nudge and check it against the tests.

### How do I set up local AI with Ollama?

1. Install Ollama from https://ollama.com/download and start it.
2. In Zen Dojo open Settings, Local AI (optional), and press Check again. It should say Ollama is running.
3. Turn on local AI help, pick a model (the suggested one fits your memory) and press Download.
4. Open a Run-button problem. A collapsed Ask local AI panel appears under the editor.

The app talks only to Ollama on `127.0.0.1:11434` (or `localhost`); any other address is refused. Prompts and answers are not logged or stored, and there is no telemetry. The model download is done by Ollama from Ollama's servers when you press Download.

### Which model size fits my computer?

With a graphics card, its memory counts. Without one, about 60 percent of your RAM can be used. The app suggests a model from this table:

- 2 GB usable: llama3.2:3b
- 6 GB usable: qwen2.5-coder:7b
- 12 GB usable: qwen2.5-coder:14b
- 20 GB usable: qwen2.5-coder:32b

Smaller is always fine. Without a graphics card, long answers are slow. On Apple Silicon the app treats memory as shared. To free disk space run `ollama rm <model>`, for example `ollama rm llama3.2:3b`. Turning the switch off in Settings hides all AI features.

### Can I use Claude Code, Gemini CLI or Codex CLI instead of Ollama?

On the desktop app, Settings, Local AI has an Answers from list. It shows This computer (Ollama) and, if found on the computer, Claude Code, Gemini CLI and Codex CLI. Status as of 2026-11-11:

- Claude Code: verified with a real run. Started with its tools turned off, no MCP servers and no user settings, so it cannot edit files or run commands.
- Gemini CLI: unverified (not installed on the machine where this was checked). It uses the tool's documented read-only mode. If a flag is wrong, the Test button shows the error and the tool simply cannot be selected.
- Codex CLI: unverified in the same way; it runs with a read-only sandbox.
- Antigravity: not offered. Its command takes the prompt as an argument and has no flag that turns its tools off, so it cannot be restricted.

Every tool is started with a fixed argument list, no shell, the prompt on standard input only, an empty temporary folder as the working folder, a 120 second timeout and a 200 KB output cap. Arguments, prompts and answers are never logged.

### What is the consent box for cloud AI tools?

Claude Code, Gemini CLI and Codex CLI send your problem text and code to their company's servers. So a cloud tool cannot be chosen until you tick its box ("I understand my problem text and code go to ..."). The server checks your consent on every request, not only the screen.

1. Tick the box for the tool, then press its Test button. It sends the word "ping" and shows the reply or the error.
2. To withdraw, untick the box. If that tool was in use, answers go back to Ollama.

The chosen source and the consent boxes are device settings and are never synced to other devices.

### How do I use AI on the hosted site? (bring your own API key)

The hosted site has no local AI. You paste your own API key from Anthropic (Claude), OpenAI (GPT) or Google (Gemini) in Settings, AI help with your own key.

1. Open Settings, AI help with your own key and pick a provider.
2. Follow the steps shown for that provider: sign in to its console, add a little credit under billing, create an API key and copy it (it is shown once). Anthropic keys start with `sk-ant-`, OpenAI keys with `sk-`.
3. Paste the key and, if you want, a model name. The defaults are claude-haiku-5-5, gpt-5.4-mini and gemini-3.5-flash-lite.
4. Press Test or ask a question in a problem's AI panel.

Cost: the provider bills your account per token. A chat answer on the default model costs a fraction of a cent, according to the app's own note; check your provider's current prices.

### Where is my API key stored, and what is sent?

- The key lives only in your browser's local storage on that device. It is never saved by the server, never put in the database and never synced to other devices.
- On each AI request the key goes in a request header to the site's server, which uses it for that one request to the provider and then forgets it. It is not logged, not placed in a URL and not included in any error or response. Error text from the provider is never passed back to you.
- What goes to the provider: the problem text and your saved code (and your chat messages) for that question, sent over HTTPS directly from the server to Anthropic, OpenAI or Google.

To remove the key, clear it in Settings or clear the site's browser data. Anyone with access to your browser profile could read it, so do not use this on a shared computer. Not verified: the retention policies of each provider; read theirs.

## Accounts and sync

_GitHub sign-in, what syncs, deleting data and the hosted site._

### How do I sign in and what does it do?

Sign in with GitHub in Settings, Sync across devices (or the Sign in card on Today or the You tab). It is optional. Your local database stays the main copy and everything works offline. When signed in, your progress is kept in step across your devices through a small sync service.

On the desktop app the sign-in finishes in your browser and returns through the `zendojo://` link. See the Linux section if that fails on Linux.

### What syncs, and what never syncs?

Syncs: task progress, problem solves, notes and saved code (per problem), run results (including the code you ran), content pack progress, practice sessions, focus timer sessions, reading progress and your own reading links, the stuck list, boss fight results, and most settings.

Never syncs:

- The browser extension pairing key and the content feed address.
- The tools notice setting and every AI setting: AI on or off, the chosen model, the Ollama address, the chosen provider and the cloud consent boxes.
- Any setting whose name contains token, secret, key or password. Your own AI API key is not in the database at all: it stays in the browser.
- Downloaded compilers and the other contents of the `tools` folder, backups and logs.

Not verified: whether imported content packs, saved diagrams and pet files stay local. They are not in the sync table list, so the code does not sync them as tables.

### What is the difference between deleting cloud data and deleting data on this device?

They are two separate actions, each with its own typed confirmation (type DELETE). Neither touches the other side.

- Delete cloud data: removes your synced rows from the sync service (optionally also your account and sessions). Your device and other devices keep their local data. This device unlinks itself so it does not upload again by accident. It also removes your public profile. At most 3 successful deletions per hour.
- Delete local data: erases the progress stored on this device only. Settings and imported content are kept by default. Your cloud copy is not harmed and can restore a new device.

Download a backup first (see the backups answer). Details: `docs/account-data.md`.

### What is guest mode on the hosted site?

Signed-out visitors can look around everything, but nothing they do is saved: guests get a throwaway in-memory database for each request. Progress saves only after GitHub sign-in. The site says so on screen.

The site also treats a signed-in user as a guest until the hosting's database settings exist, so if you sign in and nothing saves, the site owner may not have finished setup. Not verified: how this appears on a given deployment.

### What are the limits of the hosted site?

- Each signed-in user gets one Turso database. The free plan allows 100 databases in total, so about 99 signed-in users, and 10 million row writes per month for everyone. When a limit is hit, the site shows an error; your desktop app and cloud copy are unaffected. What exactly happens beyond the limits is unverified.
- The site runs on Vercel's Hobby plan, which is for non-commercial personal use only.
- Sync runs on request, at most once per 20 seconds per user, and after each change. There is no background sync.
- Running code, the browser extension, restoring a database file, the local backup download, AI that uses programs on your computer and the admin pages are not available (see the next section).

Sources and the date they were checked: `docs/hosted-architecture.md` (2026-11-12).

## Hosted site and phone

_What works on the website and on a phone._

### What works on the hosted site and what does not?

Works: reading problems, hints, solutions, lessons and your plan; editing and saving notes and code; ticking plan tasks; tracking; sync after GitHub sign-in; your own-key AI help; the Portfolio and public profile.

Does not work: Run, Submit and Java project Run (every such request is refused with a message that running code is available in the desktop app), tool installs, the browser extension and its pairing key, restoring a database file, the local backup download, AI that uses programs on the computer, and `/admin`.

### How do I install Zen Dojo on my phone's home screen?

Open your hosted Zen Dojo address in the phone browser and sign in. The phone layout has a tab bar at the bottom (Today, Practice, Learn, Review, You).

- iPhone: use Safari (other iOS browsers cannot install it). Tap Share, then Add to Home Screen, then Add.
- Android: in Chrome open the menu, then Install app (or Add to Home screen).

It opens full screen with the Zen Dojo icon. It still needs a connection: offline you see a short "You are offline" page. The app's service worker never stores your data or signed-in pages on the phone. The service worker runs only in production builds.

### What is Reader mode (read-only study mode) on a phone?

It is a comfort setting: Run, Submit, Check, Reset and Mark solved are hidden and code editors are read-only. You can still read problems, hints, solutions, your saved code, past submissions, lessons and your plan; tick plan tasks; and edit notes.

Turn it on or off in Profile, Settings, Appearance. It is stored in a cookie on that device. It is not a security feature; the hosted server refuses code execution on its own.

## Buddy and pets

_Importing a Petdex pet._

### How do I import a pet from Petdex?

1. Open Settings, Buddy, and find the pet section.
2. Paste the pet's link, or download the zip from the pet's page on petdex.dev and upload it. Zen Dojo includes no pets itself.
3. Pick the pet in the list. The pet is animated by mood and you can drag and throw it.

Accepted link format: `https://petdex.dev/pets/<name>`, with the name made of lowercase letters, digits and dashes, for example `https://petdex.dev/pets/shinchan`. `www.petdex.dev`, a trailing slash, a query or a hash are fine. Not accepted: `http://`, a different site, a port number, a name with other characters, or a link to anything but a pet page. Names that end in a number, like `luffy-2`, work.

### Pet import failed. What should I do?

- "That is not a Petdex pet link": check the format above.
- "Could not find the pet's download on that page": the page may have changed or the pet has no zip. Download the zip by hand from the page and upload it.
- "Could not reach petdex.dev" or "took too long": check your connection or firewall and try again, or download the zip and upload it.
- "Over 6 MB": the importer refuses files bigger than 6 MB.

Uploading the downloaded zip always works without the link step. You can also import your own image.

## Portfolio and public profile

_What becomes public and how to turn it off._

### What becomes public if I turn on my public profile?

Nothing is uploaded until you switch on Make my profile public (Profile, Portfolio, Public profile; you must be signed in). Then a snapshot is published at `/u/<id>`, a random 22-character id that is not your account id.

Public: your display name (up to 60 characters), level, XP, streaks, active days, hours, total solved and solved by difficulty, roadmap problem total, interview-plan weeks done, course progress (title, done, total, completion date), the 16-week activity map and badges.

Never included: email, GitHub login or id, avatar, notes, code, solutions, reflections, tokens, keys, your interview date, LeetCode data.

### How do I turn my public profile off?

1. Open Profile, Portfolio, Public profile.
2. Switch off Make my profile public. The stored snapshot is deleted and the link stops working (cached copies expire within 60 seconds).

Turning it on again creates a new link. Delete cloud data also removes the public profile. The snapshot is refreshed when you open the Portfolio page or press Update public profile; there is no background job.

### What are the certificates in the Portfolio?

When you finish a course (a study area, a DSA pattern set or the plan), the Portfolio shows it as certified with a certificate you can print or save as PDF. It is a course completion certificate made by the app, for you to show, like a progress record.

It is not a code-signing certificate and has nothing to do with the warnings from Windows or macOS. See the Certificates and signing section.

## Certificates and signing

_Why the installers warn, what removes the warnings, and what is not a certificate._

### I have an MIT licence on GitHub. Doesn't that remove the Windows and macOS warnings?

No. The MIT licence is a copyright licence: it says what other people may do with the source code. It is not a code-signing certificate. Windows SmartScreen, Windows Smart App Control and macOS Gatekeeper never look at it. They look at a digital signature on the installer or app, made with a certificate issued by a trusted authority after the publisher's identity was checked.

### What does the app do today without certificates?

- The Windows installer and the macOS app are not signed with a paid certificate. The macOS app has an ad-hoc signature only, so Apple Silicon will run it, but Gatekeeper still warns once.
- You click through the warnings once (see the Windows and macOS sections). The warning is expected and is not a sign of damage.
- Update files are hash-checked: the update information (`latest.yml`) holds the installer's hash and the Windows and Linux updater checks it.
- The tool installer verifies a SHA-256 for every compiler and runtime it downloads before unpacking.
- Always download from the project's GitHub releases page only.

Nothing about signing is set up yet. `docs/signing.md` lists the options.

### What does Windows need to stop the warnings? (Authenticode, Artifact Signing, SignPath, EV and OV)

Windows needs the installer signed with an Authenticode code-signing certificate. Options, with what could and could not be verified against official pages on 2026-11-12:

- Microsoft Artifact Signing (Azure, formerly Trusted Signing): a managed service. Microsoft's pages (learn.microsoft.com/azure/artifact-signing/faq and the Smart App Control signing page) say it is the preferred way to sign for Smart App Control, needs a paid Azure subscription (free, trial and sponsored subscriptions are not supported), has Basic and Premium plans (5,000 and 100,000 signatures a month included, per azure.microsoft.com/pricing/details/artifact-signing), checks your identity (organization or individual) and keeps the certificate in the service so you never hold it. It does not issue EV certificates. Not verified: the monthly price (the pricing page we could read showed no figure; the earlier note of about 10 dollars a month in the repo is from memory) and which countries are eligible (the quickstart page lists them; check it).
- SignPath Foundation: free code signing for open-source projects (signpath.org/terms). Conditions: an OSI-approved open-source licence with no commercial dual licence, active maintenance, no proprietary code, a code signing policy on the project home page, multi-factor authentication for the team, only binaries built from your own source, and manual approval for each release. The certificate belongs to SignPath Foundation, so the publisher shown is SignPath Foundation, not the project. The page was marked as a draft; apply and check the current terms.
- A certificate from a certificate authority: OV (organization validated) or EV (extended validation), roughly 200 to 500 dollars a year (a rough figure from the repo's notes, not verified against a seller). Both need identity checks and usually a hardware token or cloud-held key. Historically EV got SmartScreen trust faster, but do not rely on that: not verified in this pass.

Reputation: even a correctly signed installer from a new publisher can still show SmartScreen prompts until enough people have installed it. Microsoft's own FAQ says the prompt stops once the file has enough download history, and suggests submitting the signed file to Microsoft Security Intelligence if it persists. Signing makes the publisher name show and builds reputation over time; it is not an instant fix.

Smart App Control: Microsoft says it allows apps signed with certificates from trusted providers. Smart App Control also blocks the unsigned programs that your own compiler produces (see the Windows section); signing the installer does not fix that, because those programs are built on your machine.

### What does macOS need? (Developer ID, notarization, auto-update)

macOS needs the app signed with a Developer ID Application certificate and notarized by Apple. You get both by joining the Apple Developer Program, which has been 99 US dollars a year (general knowledge: Apple's pages that were reachable did not state the price in this pass, so check developer.apple.com/programs before paying).

What it unlocks:

- The Gatekeeper warning ("Apple could not verify...") goes away for a signed and notarized app. This is the only way to remove it.
- Auto-update: the updater can install updates only for a signed app, which is why the macOS app today just tells you a new version exists and opens the release page.
- After the change the build would turn on the hardened runtime and notarization. The repo notes that the SQLite native module must be tested with the hardened runtime on, because it is off today for exactly that reason.

### Does Linux need a certificate?

No. Linux does not block unsigned AppImages the way Windows and macOS do. Optionally you can publish a checksum file and sign it with GPG so people can verify the download. This project does not do that yet (nothing in the repo or release workflow sets it up). Not verified: GPG signing is general practice, not tested here.

### What would an Android or iOS app need?

- Android: a keystore you create yourself (your upload key). Google Play App Signing splits keys: you sign your uploads with the upload key; Google holds the app signing key and signs what users install (support.google.com/googleplay/android-developer/answer/9842756, read 2026-11-12). Keep the upload keystore and its passwords safe. If you lose the upload key Google can reset it; if you supply your own app signing key and lose it, it cannot be reset. A Play developer account has a one-time registration fee; not verified here.
- iOS: you need the Apple Developer Program (the same membership as for macOS), then signing certificates and provisioning profiles to run on devices and to publish through TestFlight and the App Store.

Zen Dojo has no Android or iOS app today. On a phone you install the hosted website to your home screen (see Hosted site and phone), which needs no signing.

### How would I manage and renew certificates, and where do the secrets go?

- Keep every certificate, password and token out of the repo, chat and issues. Add them yourself in GitHub under Settings, Secrets and variables, Actions.
- Planned secret names in `docs/signing.md`: `SIGNPATH_API_TOKEN` (with organization id, project slug and policy slug as repository variables); `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` for Artifact Signing; `CSC_LINK` and `CSC_KEY_PASSWORD` for a certificate file; and for macOS `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- Renewal: put the certificate's expiry date in your calendar. With Artifact Signing the service renews the certificate for you, but you must renew the identity validation before it expires (Microsoft sends reminders starting 60 days before) or signing stops. A certificate from a seller must be re-bought or renewed and the secret replaced. The Apple Developer Program membership renews yearly; if it lapses you cannot sign or notarize new builds.
- The release workflow must skip signing cleanly when the secrets are absent, and signing must happen before `latest.yml` is produced, because that file holds the installer's hash.
- Never reuse or move a published tag. Test signing with a new pre-release tag such as `v0.7.2-rc1`.

### How is a code-signing certificate different from the course certificates?

- Code-signing certificate: a cryptographic identity for the app's installer, issued by a certificate authority. It proves who published the software. It is about trust in the download. Not set up yet.
- Course completion certificate: a printable page in the Portfolio that says you finished a course. It is made by the app from your progress. It proves nothing about the software and does nothing for SmartScreen or Gatekeeper.
- MIT licence: a text file that grants permission to use and copy the code. Neither of the above.

## Content

_Adding problems and lessons without a release._

### How do I add a problem or a lesson without a release?

Each is one small JSON file; complete examples are in `docs/examples/`. Run (from the repo):

```
pnpm content:add docs/examples/one-problem.json
```

- A problem you can run (`type: problem`): shows in the DSA list under Other solves and in the pattern pages you name.
- More test cases for any problem (`type: tests`): `output` is optional; if missing it is computed by running the problem's C++ reference solution (needs g++).
- A lesson (`type: lesson`): shows in Learn under Added items.
- A reading link (`type: reading`).

Without the repo, you can import a content pack (a JSON file of lessons and problems) in Settings, Add problems and lessons. Formats: `docs/content-packs.md` and `docs/content-editing.md`. For a hosted copy, point the command at the database or use the app's content admin token.

### How do I change a built-in lesson?

Built-in lessons are Markdown files in `packages/shared/content/`. Edit one, then run `pnpm content:build` (and `pnpm content:check` to verify). Or replace one for yourself without code through a content pack `patch`; the lesson then has a Back to built-in button. See `docs/content-editing.md`.

Reference solutions in Java and Python are plain files in `packages/shared/content/solutions/<problem-id>.java` and `.py` (see `docs/solutions.md`).

## Developers

_Checks and releases._

### How do I run the checks?

- While working, run only targeted tests: `pnpm exec vitest run <path/to/file.test.ts>` (a few seconds) and `pnpm -r typecheck`.
- Do not run the full `pnpm test` during development: it compiles every C++ and Java demo and takes about 3.5 minutes.
- Once at the end, before a push, run `pnpm check` (lint, typecheck, tests, build; about 5 minutes). It already runs the tests, so do not run `pnpm test` first.
- On Windows PowerShell use `pnpm.cmd` if script execution is blocked.
- Never test against `data/habit.db` or the desktop app-data folder; use a copy or an in-memory database.

### How do I publish a desktop release?

1. Bump `version` in `apps/desktop/package.json` and commit.
2. Tag it: `git tag vX.Y.Z` (it must match the version; the workflow checks) and push the tag.
3. The Desktop app workflow builds Windows, macOS and Linux installers and publishes a GitHub release with `latest*.yml` and `.blockmap` files. Installed apps pick it up.

Never reuse or move a published tag; ship a new version instead. Before a new version first starts, the desktop app backs up the database (see backups).

### How do I edit this FAQ?

Edit `apps/web/lib/faq.ts` (the single source). Then run `pnpm faq:build` to regenerate `docs/faq.md`. The test `apps/web/lib/faq.test.ts` checks that ids are unique, answers are not empty, there is no emoji, every category is used and `docs/faq.md` is up to date.
