# Troubleshooting

## Run code needs a compiler, a JDK, Node or Python

The Run button uses programs installed on your computer. Reading, plans, notes and tracking work without them. Open
**Profile, Settings, Tools for running code** (`/profile/settings/tools`) to see which of C++ (g++), Java (JDK), Node and
Python 3 were found, copy the install command for your system, and press **Check again**. In the desktop app, Today
also shows a dismissible notice while something is missing. The desktop app can also download Java, Python and (on
Windows) a C++ compiler for you with one button, without administrator rights: see `docs/tools.md`.

- **Python is found in this order:** the `HABIT_PYTHON` environment variable if set (it is then the only candidate);
  on Windows `py -3`, then `python`; on macOS and Linux `python3`, then `python`. Python 3 is required: a Python 2 is
  ignored.
- **The Microsoft Store stub counts as missing.** A fresh Windows has a fake `python.exe` that only opens the Store.
  The check treats it as not installed. Install Python with `winget install Python.Python.3.12`.
- **JavaScript** in the desktop app can run on the app's own runtime, so Node is only needed outside the app or when
  the built-in runtime is blocked.
- Other overrides: `HABIT_GPP`, `HABIT_JAVAC`, `HABIT_JAVA`, `HABIT_NODE` point at a specific program. Restart the app
  after installing something so it sees the new PATH.
- Installer warnings on first install (SmartScreen, Gatekeeper): see `docs/signing.md`.

## Windows blocks C++ (Smart App Control and Defender reputation)

When running C++ code on Windows 11, the judge compiles a temporary executable (`main.exe`) in the operating system's temporary directory and attempts to spawn it. On systems where **Smart App Control** is active (or Windows Defender Reputation-based protection is in strict mode), the operating system refuses to start the newly generated executable because it is unsigned and has no established digital reputation.

### Symptoms
- Running C++ code fails with an error such as `spawn UNKNOWN`, `spawn EPERM`, or judge status `unavailable`.
- The in-app editor displays a banner explaining that the operating system blocked the binary and switches the language picker to Java (or JavaScript if Java is not installed).

### Why Java and JavaScript work
- Java programs execute under `java.exe` (a signed runtime from your JDK installation, e.g., Eclipse Temurin).
- JavaScript programs execute under `node.exe` (a signed runtime from the Node.js Foundation).
- Because both runtimes are digitally signed and recognized, Windows Smart App Control allows them to start and run user code without obstruction.

### Options
1. **Solve in Java or JavaScript**: The editor automatically switches and remembers this language choice per problem.
2. **Add an exclusion**: Add the app directory or temporary folder to **Windows Security > Virus & threat protection > Manage settings > Exclusions**.
3. **Smart App Control settings**: In **Windows Security > App & browser control > Smart App Control settings**. Note: Windows does not allow turning Smart App Control back on after disabling it without reinstalling the OS.
4. **WebAssembly evaluation (Plan 0034 Part B ADR)**: Formally rejected because in-browser Wasm Clang is 5–15× slower to compile and adds 40MB+ of binary bloat. Java/Node signed runtimes remain the high-speed solution on Windows.

## Linux AppImage: Sign-in deep linking (`zendojo://`)

When signing in on the desktop app, authentication completes in your default web browser and redirects back to the desktop app via the `zendojo://` custom protocol.

On Linux using the standalone AppImage, the desktop environment must know how to route the `zendojo://` URL scheme to the AppImage executable:
- **AppImageLauncher**: If you use AppImageLauncher or a similar daemon, desktop integration and protocol registration are handled automatically when installing or launching the AppImage.
- **Manual desktop registration**: If running the AppImage directly, ensure a `.desktop` file exists (e.g. in `~/.local/share/applications/`) with `MimeType=x-scheme-handler/zendojo;` and `Exec=/path/to/ZenDojo.AppImage %u`, then update the MIME database via `update-desktop-database ~/.local/share/applications/`.

