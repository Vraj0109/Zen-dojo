import type { JudgeLang, ProblemSpec, Ty } from "@habit/shared";
import { cppNodeIo, cppPrelude, javaNodeHelpers, javaNodeWriter, jsArg, jsNodePrelude, jsResult } from "./harness-nodes";

export { javaSupportFiles } from "./harness-nodes";

// Builds the program that runs your function on the test cases. Your code is placed first, then this harness reads
// the cases from standard input (line 1: how many; then one JSON array of arguments per line), calls your function,
// and prints one line per case: "OK<TAB>result as JSON<TAB>microseconds" or "ERR<TAB>message".
// The static parts are String.raw so backslashes reach the target language untouched.

const CPP_READ_WRITE = String.raw`
struct HabitReader {
    std::string s; size_t i = 0;
    void ws() { while (i < s.size() && isspace((unsigned char)s[i])) i++; }
    char peek() { ws(); return i < s.size() ? s[i] : 0; }
    void expect(char c) { ws(); if (i >= s.size() || s[i] != c) throw std::runtime_error(std::string("bad test input, expected ") + c); i++; }
};
static std::string habitNum(HabitReader& r) {
    r.ws(); size_t j = r.i;
    while (j < r.s.size() && (isdigit((unsigned char)r.s[j]) || r.s[j] == '-' || r.s[j] == '+' || r.s[j] == '.' || r.s[j] == 'e' || r.s[j] == 'E')) j++;
    std::string t = r.s.substr(r.i, j - r.i); r.i = j; return t;
}
static void habitRead(HabitReader& r, int& x) { x = (int)std::stoll(habitNum(r)); }
static void habitRead(HabitReader& r, long long& x) { x = std::stoll(habitNum(r)); }
static void habitRead(HabitReader& r, double& x) { x = std::stod(habitNum(r)); }
static void habitRead(HabitReader& r, bool& x) {
    r.ws();
    if (r.s.compare(r.i, 4, "true") == 0) { x = true; r.i += 4; }
    else if (r.s.compare(r.i, 5, "false") == 0) { x = false; r.i += 5; }
    else throw std::runtime_error("bad test input, expected a boolean");
}
static void habitRead(HabitReader& r, std::string& x) {
    r.expect('"'); x.clear();
    while (r.i < r.s.size() && r.s[r.i] != '"') {
        char c = r.s[r.i++];
        if (c == '\\' && r.i < r.s.size()) { char d = r.s[r.i++]; c = d == 'n' ? '\n' : d == 't' ? '\t' : d; }
        x += c;
    }
    r.i++;
}
template <class T> static void habitRead(HabitReader& r, std::vector<T>& v) {
    r.expect('['); v.clear();
    if (r.peek() == ']') { r.i++; return; }
    while (true) {
        T t{}; habitRead(r, t); v.push_back(t);
        if (r.peek() == ',') { r.i++; continue; }
        r.expect(']'); break;
    }
}
static void habitWrite(std::ostream& o, int x) { o << x; }
static void habitWrite(std::ostream& o, long long x) { o << x; }
static void habitWrite(std::ostream& o, double x) { o << std::setprecision(12) << x; }
static void habitWrite(std::ostream& o, bool x) { o << (x ? "true" : "false"); }
static void habitWrite(std::ostream& o, const std::string& x) {
    o << '"';
    for (char c : x) { if (c == '"' || c == '\\') o << '\\' << c; else if (c == '\n') o << "\\n"; else if (c == '\t') o << "\\t"; else o << c; }
    o << '"';
}
template <class T> static void habitWrite(std::ostream& o, const std::vector<T>& v) {
    o << '[';
    for (size_t k = 0; k < v.size(); k++) { if (k) o << ','; habitWrite(o, (T)v[k]); }
    o << ']';
}
`;

/** The memory limit for every language, in megabytes. Allocating more fails with an out-of-memory error. */
export const MEMORY_LIMIT_MB = 256;

// Caps this process's memory so a solution that allocates too much fails with "memory limit exceeded" instead of
// slowing the whole computer. Windows: a job object with a per-process limit. Linux and macOS: RLIMIT_AS. If the limit
// cannot be set, the program simply runs without one.
const CPP_MEMORY_LIMIT = String.raw`
#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
static void habitLimitMemory() {
    HANDLE job = CreateJobObjectA(nullptr, nullptr);
    if (!job) return;
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION info;
    memset(&info, 0, sizeof(info));
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_PROCESS_MEMORY;
    info.ProcessMemoryLimit = (SIZE_T)${"$"}{MEM} * 1024 * 1024;
    if (SetInformationJobObject(job, JobObjectExtendedLimitInformation, &info, sizeof(info))) AssignProcessToJobObject(job, GetCurrentProcess());
}
#else
#include <sys/resource.h>
static void habitLimitMemory() {
    struct rlimit r;
    r.rlim_cur = r.rlim_max = (rlim_t)${"$"}{MEM} * 1024 * 1024;
    setrlimit(RLIMIT_AS, &r);
}
#endif
`.split("${MEM}").join(String(MEMORY_LIMIT_MB));

export function cppProgram(spec: ProblemSpec, userCode: string): string {
  const { name, params } = spec.fn;
  const cppTy = (t: Ty) => ({ list: "ListNode*", tree: "TreeNode*", int: "int", long: "long long", double: "double", bool: "bool", string: "std::string", "int[]": "std::vector<int>", "long[]": "std::vector<long long>", "bool[]": "std::vector<bool>", "string[]": "std::vector<std::string>", "int[][]": "std::vector<std::vector<int>>", "string[][]": "std::vector<std::vector<std::string>>" })[t];
  const reads = params
    .map((p, k) => `            ${k > 0 ? "r.expect(',');\n            " : ""}${cppTy(p.type)} ${p.name}; habitRead(r, ${p.name});`)
    .join("\n");
  const call = `Solution().${name}(${params.map((p) => p.name).join(", ")})`;
  return (
    cppPrelude(spec) +
    userCode +
    "\n\n// ---- test harness (added by Zen Dojo) ----\n#include <bits/stdc++.h>\n" +
    CPP_READ_WRITE +
    cppNodeIo(spec) +
    CPP_MEMORY_LIMIT +
    `
int main() {
    habitLimitMemory();
    // Anything your code prints goes to the console section. The judge's own answers go to a file, so the two never mix.
    // Output is unbuffered so nothing is lost if your code crashes, and cout / printf / cerr keep their order.
    std::cout << std::unitbuf;
    setvbuf(stdout, nullptr, _IONBF, 0);
    std::string line;
    std::getline(std::cin, line);
    int n = std::stoi(line);
    std::ofstream results("results.txt");
    for (int t = 0; t < n; t++) {
        std::getline(std::cin, line);
        std::cout << char(1) << "CASE " << t << char(2) << std::endl; // tells the judge which case prints from here on
        try {
            HabitReader r{line};
            r.expect('[');
${reads}
            auto t0 = std::chrono::steady_clock::now();
            auto result = ${call};
            auto t1 = std::chrono::steady_clock::now();
            std::ostringstream o; habitWrite(o, result);
            results << "OK\\t" << o.str() << "\\t" << std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count() << std::endl;
        } catch (std::exception& e) {
            results << "ERR\\t" << e.what() << std::endl;
        } catch (...) {
            results << "ERR\\tyour code threw something that is not a standard exception" << std::endl;
        }
    }
    return 0;
}
`
  );
}

const JAVA_MAIN = String.raw`
import java.util.*;

public class Main {
    static String s; static int i;
    static void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
    static Object val() {
        ws(); char c = s.charAt(i);
        if (c == '[') {
            i++; List<Object> l = new ArrayList<>(); ws();
            if (s.charAt(i) == ']') { i++; return l; }
            while (true) { l.add(val()); ws(); if (s.charAt(i) == ',') { i++; continue; } i++; return l; }
        }
        if (c == '"') {
            i++; StringBuilder b = new StringBuilder();
            while (s.charAt(i) != '"') { char d = s.charAt(i++); if (d == '\\') { char e = s.charAt(i++); d = e == 'n' ? '\n' : e == 't' ? '\t' : e; } b.append(d); }
            i++; return b.toString();
        }
        if (s.startsWith("null", i)) { i += 4; return null; }
        if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
        if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
        int j = i; while (j < s.length() && "+-0123456789.eE".indexOf(s.charAt(j)) >= 0) j++;
        String t = s.substring(i, j); i = j;
        return (t.contains(".") || t.contains("e") || t.contains("E")) ? (Object) Double.valueOf(t) : (Object) Long.valueOf(t);
    }
    static int toInt(Object o) { return ((Number) o).intValue(); }
    static long toLong(Object o) { return ((Number) o).longValue(); }
    static double toDouble(Object o) { return ((Number) o).doubleValue(); }
    static int[] ints(Object o) { List<?> l = (List<?>) o; int[] a = new int[l.size()]; for (int k = 0; k < a.length; k++) a[k] = toInt(l.get(k)); return a; }
    static long[] longs(Object o) { List<?> l = (List<?>) o; long[] a = new long[l.size()]; for (int k = 0; k < a.length; k++) a[k] = toLong(l.get(k)); return a; }
    static boolean[] bools(Object o) { List<?> l = (List<?>) o; boolean[] a = new boolean[l.size()]; for (int k = 0; k < a.length; k++) a[k] = (Boolean) l.get(k); return a; }
    static String[] strings(Object o) { List<?> l = (List<?>) o; String[] a = new String[l.size()]; for (int k = 0; k < a.length; k++) a[k] = (String) l.get(k); return a; }
    static int[][] ints2(Object o) { List<?> l = (List<?>) o; int[][] a = new int[l.size()][]; for (int k = 0; k < a.length; k++) a[k] = ints(l.get(k)); return a; }
    static String[][] strings2(Object o) { List<?> l = (List<?>) o; String[][] a = new String[l.size()][]; for (int k = 0; k < a.length; k++) a[k] = strings(l.get(k)); return a; }

    /*NODE_HELPERS*/
    static void wr(StringBuilder b, Object o) {
        /*NODE_WRITER*/
        if (o == null) { b.append("[]"); return; }
        if (o instanceof int[]) { int[] a = (int[]) o; b.append('['); for (int k = 0; k < a.length; k++) { if (k > 0) b.append(','); b.append(a[k]); } b.append(']'); }
        else if (o instanceof long[]) { long[] a = (long[]) o; b.append('['); for (int k = 0; k < a.length; k++) { if (k > 0) b.append(','); b.append(a[k]); } b.append(']'); }
        else if (o instanceof boolean[]) { boolean[] a = (boolean[]) o; b.append('['); for (int k = 0; k < a.length; k++) { if (k > 0) b.append(','); b.append(a[k]); } b.append(']'); }
        else if (o instanceof Object[]) { Object[] a = (Object[]) o; b.append('['); for (int k = 0; k < a.length; k++) { if (k > 0) b.append(','); wr(b, a[k]); } b.append(']'); }
        else if (o instanceof String) {
            b.append('"');
            for (char c : ((String) o).toCharArray()) { if (c == '"' || c == '\\') b.append('\\').append(c); else if (c == '\n') b.append("\\n"); else if (c == '\t') b.append("\\t"); else b.append(c); }
            b.append('"');
        }
        else b.append(String.valueOf(o));
    }
`;

export function javaProgram(spec: ProblemSpec): string {
  const { name, params } = spec.fn;
  const conv = (t: Ty, expr: string) =>
    ({ list: `list(${expr})`, tree: `tree(${expr})`, int: `toInt(${expr})`, long: `toLong(${expr})`, double: `toDouble(${expr})`, bool: `(Boolean) ${expr}`, string: `(String) ${expr}`, "int[]": `ints(${expr})`, "long[]": `longs(${expr})`, "bool[]": `bools(${expr})`, "string[]": `strings(${expr})`, "int[][]": `ints2(${expr})`, "string[][]": `strings2(${expr})` })[t];
  const args = params.map((p, k) => conv(p.type, `a.get(${k})`)).join(", ");
  return (
    JAVA_MAIN.replace("/*NODE_HELPERS*/", () => javaNodeHelpers(spec)).replace("/*NODE_WRITER*/", () => javaNodeWriter(spec)) +
    `
    public static void main(String[] argv) throws Exception {
        // Anything your code prints goes to the console section. The judge's own answers go to a file.
        Scanner in = new Scanner(System.in);
        int n = Integer.parseInt(in.nextLine().trim());
        java.io.PrintWriter results = new java.io.PrintWriter(new java.io.FileWriter("results.txt"), true);
        for (int t = 0; t < n; t++) {
            s = in.nextLine(); i = 0;
            System.out.print((char) 1 + "CASE " + t + (char) 2 + "\\n"); // tells the judge which case prints from here on
            System.out.flush();
            try {
                List<?> a = (List<?>) val();
                long t0 = System.nanoTime();
                Object result = new Solution().${name}(${args});
                long us = (System.nanoTime() - t0) / 1000;
                StringBuilder b = new StringBuilder(); wr(b, result);
                results.println("OK\\t" + b + "\\t" + us);
            } catch (Throwable e) {
                results.println("ERR\\t" + e.toString().replace('\\n', ' '));
            }
            System.out.flush();
            System.err.flush();
        }
    }
}
`
  );
}

export function javascriptProgram(spec: ProblemSpec, userCode: string): string {
  const call = `${spec.fn.name}(${spec.fn.params.map((p, k) => jsArg(p.type, `args[${k}]`)).join(", ")})`;
  return (
    String.raw`
// ---- added by Zen Dojo: console output is written straight to the console section, in order ----
const __fs = require("fs");
const __fmt = require("util").format;
console.log = console.info = console.debug = (...a) => __fs.writeSync(1, __fmt(...a) + "\n");
console.error = console.warn = (...a) => __fs.writeSync(2, __fmt(...a) + "\n");
process.stdout.write = (s) => { __fs.writeSync(1, String(s)); return true; };
process.stderr.write = (s) => { __fs.writeSync(2, String(s)); return true; };
` +
    jsNodePrelude(spec) +
    userCode +
    String.raw`

// ---- test harness (added by Zen Dojo) ----
const __lines = __fs.readFileSync(0, "utf8").split("\n");
const __n = parseInt(__lines[0], 10);
for (let t = 1; t <= __n; t++) {
    __fs.writeSync(1, "\u0001CASE " + (t - 1) + "\u0002\n"); // tells the judge which case prints from here on
    try {
        const args = JSON.parse(__lines[t]);
        const t0 = process.hrtime.bigint();
        const result = ` +
    call +
    String.raw`;
        const us = Number((process.hrtime.bigint() - t0) / 1000n);
        const shown = ` +
    jsResult(spec.fn.returns, "result") +
    String.raw`;
        __fs.appendFileSync("results.txt", "OK\t" + JSON.stringify(shown === undefined ? null : shown) + "\t" + us + "\n");
    } catch (e) {
        __fs.appendFileSync("results.txt", "ERR\t" + String((e && e.message) || e).split("\n")[0] + "\n");
    }
}
`
  );
}

export type { JudgeLang };
