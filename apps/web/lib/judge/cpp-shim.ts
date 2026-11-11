// macOS: `g++` is Apple's clang, whose C++ library has no <bits/stdc++.h> (a GCC-only "include everything" header). The judge and most
// competitive-programming code include it, so for clang the judge writes this stand-in header next to main.cpp and adds -I. to the compile.

/** The standard headers GCC's <bits/stdc++.h> pulls in (C++17), that clang's library also has. */
export const STD_HEADERS = [
  "algorithm", "array", "atomic", "bitset", "cassert", "cctype", "cerrno", "cfenv", "cfloat", "chrono", "cinttypes", "climits", "clocale", "cmath",
  "complex", "condition_variable", "csetjmp", "csignal", "cstdarg", "cstddef", "cstdint", "cstdio", "cstdlib", "cstring", "ctime", "cwchar", "cwctype",
  "deque", "exception", "forward_list", "fstream", "functional", "future", "initializer_list", "iomanip", "ios", "iosfwd", "iostream", "istream",
  "iterator", "limits", "list", "locale", "map", "memory", "mutex", "new", "numeric", "optional", "ostream", "queue", "random", "ratio", "regex",
  "scoped_allocator", "set", "sstream", "stack", "stdexcept", "streambuf", "string", "string_view", "system_error", "thread", "tuple", "typeindex",
  "typeinfo", "type_traits", "unordered_map", "unordered_set", "utility", "valarray", "variant", "vector",
] as const;

export const STDCXX_SHIM = `#pragma once\n// Stand-in for GCC's <bits/stdc++.h> (written by Zen Dojo because this compiler is clang).\n${STD_HEADERS.map((h) => `#include <${h}>`).join("\n")}\n`;

/** True when `g++ --version` output says the compiler is clang (Apple's g++ is clang under the name g++). */
export const isClangVersion = (versionText: string): boolean => /\bclang\b/i.test(versionText);
