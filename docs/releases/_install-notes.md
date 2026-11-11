
---

### First install

The installers are not signed with a paid certificate yet, so your computer warns once. This is expected.

- **Windows:** SmartScreen says *Windows protected your PC*. Choose *More info*, then *Run anyway*.
- **macOS:** right-click the app and choose *Open*. If it says the app is damaged, run `xattr -dr com.apple.quarantine "/Applications/Zen Dojo.app"` in Terminal, then open it again.
- **Linux:** make the AppImage executable (`chmod +x ZenDojo-*.AppImage`), then run it.

Reading, plans and notes work right away. To use the Run button you need a C++ compiler, a JDK or Python on your computer: open *Profile, Settings, Tools for running code* in the app to see what is missing and copy the install command.
