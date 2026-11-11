
---

### First install

The installers are not signed with a paid certificate yet, so your computer warns once. This is expected.

- **Windows:** SmartScreen says *Windows protected your PC*. Choose *More info*, then *Run anyway*.
- **macOS:** the first time, macOS says *"Zen Dojo" not opened: Apple could not verify it is free of malware*. The app is not notarized yet, so this is expected, not a sign of damage. Click *Done*, then open **System Settings, Privacy & Security**, scroll to *Security*, click **Open Anyway** next to Zen Dojo, and confirm with your password. (On macOS 14 and older you can instead right-click the app and choose *Open*.) The shortcut that works on every version is one line in Terminal: `xattr -dr com.apple.quarantine "/Applications/Zen Dojo.app"`, then open the app again.
- **Linux:** make the AppImage executable (`chmod +x ZenDojo-*.AppImage`), then run it.

Reading, plans and notes work right away. To use the Run button you need a C++ compiler, a JDK or Python on your computer: open *Profile, Settings, Tools for running code* in the app to see what is missing and copy the install command.
