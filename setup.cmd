@echo off
rem Double-click or run "setup.cmd [-Docker] [-Ollama] [-CheckOnly] [-SkipBuild] [-Start]".
rem Wrapper so the PowerShell script runs without changing your execution policy.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*
