# Troubleshooting

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

