import type { ProblemSpec } from "@habit/shared";

// The Python test program. main.py = a hidden prelude + your code + this harness. The prelude imports the usual modules and
// defines ListNode, TreeNode and Node like LeetCode does. The cases run in a thread with a big stack, so deep recursion
// (10^5 levels) works. It reads the cases from standard input like the other harnesses and writes answers to results.txt.
// Needs Python 3.9 or newer.

/** Stack of the thread that runs your code, in megabytes. */
const PY_STACK_MB = 128;

/** Added before your Python code in main.py (and hidden from you). */
export const PYTHON_PRELUDE = String.raw`import sys, math, heapq, bisect, itertools, functools, collections, random
from typing import *
from collections import deque, defaultdict, Counter
sys.setrecursionlimit(1000000); getattr(sys, "set_int_max_str_digits", lambda n: None)(0)


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


`;
export const PYTHON_PRELUDE_LINES = PYTHON_PRELUDE.split("\n").length - 1;

const HELPERS = String.raw`
import json as _hjson, os as _hos, threading as _hthreading, time as _htime, traceback as _htb


class _HabitOpError(Exception):
    pass


def _habit_list_from(a):
    head = ListNode(0)
    t = head
    for x in a:
        t.next = ListNode(x)
        t = t.next
    return head.next


def _habit_list_to(h):
    out = []
    while h is not None:
        out.append(h.val)
        h = h.next
        if len(out) > 5000000:
            raise ValueError("the returned list never ends (does it have a cycle?)")
    return out


def _habit_tree_from(a):
    if not a or a[0] is None:
        return None
    root = TreeNode(a[0])
    q = [root]
    k = 1
    qi = 0
    while qi < len(q) and k < len(a):
        n = q[qi]
        qi += 1
        if k < len(a):
            if a[k] is not None:
                n.left = TreeNode(a[k])
                q.append(n.left)
            k += 1
        if k < len(a):
            if a[k] is not None:
                n.right = TreeNode(a[k])
                q.append(n.right)
            k += 1
    return root


def _habit_tree_to(r):
    out = []
    q = [r] if r is not None else []
    i = 0
    while i < len(q):
        n = q[i]
        i += 1
        if n is None:
            out.append(None)
            continue
        out.append(n.val)
        q.append(n.left)
        q.append(n.right)
        if len(q) > 20000000:
            raise ValueError("the returned tree is too large (does it have a cycle?)")
    while out and out[-1] is None:
        out.pop()
    return out


def _habit_default(o):
    if isinstance(o, (set, frozenset)):
        return sorted(o)
    if isinstance(o, ListNode):
        return _habit_list_to(o)
    if isinstance(o, TreeNode):
        return _habit_tree_to(o)
    raise TypeError("the answer has type " + type(o).__name__ + ", which cannot be written as JSON")


def _habit_describe(e):
    if isinstance(e, _HabitOpError):
        return str(e)
    if isinstance(e, MemoryError):
        return "MemoryError: out of memory"
    name = type(e).__name__
    msg = name + ": " + str(e) if str(e) else name
    line = None
    try:
        for fr in _htb.extract_tb(e.__traceback__, limit=-40):
            if fr.filename.replace("\\", "/").endswith("main.py") and _HABIT_PRE < fr.lineno <= _HABIT_PRE + _HABIT_USER:
                line = fr.lineno - _HABIT_PRE
    except Exception:
        line = None
    if line is not None:
        msg += " (line " + str(line) + ")"
    return " ".join(msg.split("\n"))[:2000]


def _habit_build_graph(adj):
    if not adj:
        return None
    n = len(adj)
    nodes = [None] + [Node(i) for i in range(1, n + 1)]
    for i, nbs in enumerate(adj):
        for nb in nbs:
            if 1 <= nb <= n:
                nodes[i + 1].neighbors.append(nodes[nb])
    return nodes[1]


def _habit_graph_ids(root):
    seen = {}
    if root is None:
        return seen
    q = [root]
    seen[id(root)] = root
    qi = 0
    while qi < len(q):
        cur = q[qi]
        qi += 1
        for nb in (cur.neighbors or []):
            if nb is not None and id(nb) not in seen:
                seen[id(nb)] = nb
                q.append(nb)
    return seen


def _habit_serialize_graph(root, orig):
    if root is None:
        return []
    visited = {root.val: root}
    q = [root]
    qi = 0
    max_val = root.val
    while qi < len(q):
        cur = q[qi]
        qi += 1
        if id(cur) in orig:
            raise ValueError("Cloned graph contains original node pointer (not a deep copy)")
        max_val = max(max_val, cur.val)
        for nb in (cur.neighbors or []):
            if nb is None:
                continue
            if nb.val not in visited:
                visited[nb.val] = nb
                q.append(nb)
            elif visited[nb.val] is not nb:
                raise ValueError("Conflicting node pointers")
    adj = []
    for i in range(1, max_val + 1):
        node = visited.get(i)
        if node is None or not node.neighbors:
            adj.append([])
        else:
            adj.append(sorted(n.val for n in node.neighbors if n is not None))
    return adj


def _habit_limit_memory():
    # Linux and macOS: cap the address space (the memory limit plus room for the big stack). Windows has no such call.
    try:
        import resource
        lim = (@MEM@ + @STACK@ + 64) * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (lim, lim))
    except Exception:
        pass
`;

const CLOCK = "_htime.perf_counter_ns()";

/** The body of one case (12 spaces deep, inside the try). It defines `shown` (the answer) and `us` (microseconds in your code). */
function caseBody(spec: ProblemSpec): string {
  if (spec.id === "lc-297") {
    return String.raw`root = _habit_tree_from(args[0])
            t0 = ${CLOCK}
            if "Codec" in globals():
                codec = Codec()
                res = codec.deserialize(codec.serialize(root))
            else:
                res = deserialize(serialize(root))
            us = (${CLOCK} - t0) // 1000
            shown = _habit_tree_to(res)`;
  }
  if (spec.id === "lc-133") {
    return String.raw`orig = _habit_build_graph(args[0])
            orig_ids = _habit_graph_ids(orig)
            t0 = ${CLOCK}
            cloned = Solution().cloneGraph(orig)
            us = (${CLOCK} - t0) // 1000
            shown = _habit_serialize_graph(cloned, orig_ids)`;
  }
  if (spec.design) {
    const d = spec.design;
    const names = JSON.stringify(d.methods.map((m) => m.name));
    const voids = JSON.stringify(d.methods.filter((m) => m.returns === "void").map((m) => m.name));
    const convert = d.ctor.some((p) => p.type === "tree" || p.type === "list");
    const ctorArgs = convert
      ? d.ctor.map((p, i) => (p.type === "tree" ? `_habit_tree_from(arglists[k][${i}])` : p.type === "list" ? `_habit_list_from(arglists[k][${i}])` : `arglists[k][${i}]`)).join(", ")
      : "*arglists[k]";
    return String.raw`ops = args[0]
            arglists = args[1]
            methods = ${names}
            voids = ${voids}
            obj = None
            us = 0
            shown = []
            for k in range(len(ops)):
                op = ops[k]
                try:
                    t0 = ${CLOCK}
                    if op == "${d.className}":
                        obj = ${d.className}(${ctorArgs})
                        shown.append(None)
                    elif op in methods:
                        res = getattr(obj, op)(*arglists[k])
                        shown.append(None if (op in voids or res is None) else res)
                    else:
                        raise ValueError("there is no operation called " + str(op))
                    us += (${CLOCK} - t0) // 1000
                except Exception as e:
                    raise _HabitOpError("operation " + str(k + 1) + " (" + str(op) + "): " + _habit_describe(e)) from None`;
  }
  const conv = spec.fn.params
    .map((p, k) => (p.type === "list" ? `_habit_list_from(args[${k}])` : p.type === "tree" ? `_habit_tree_from(args[${k}])` : `args[${k}]`))
    .join(", ");
  const ret = spec.fn.returns === "list" ? "_habit_list_to(result)" : spec.fn.returns === "tree" ? "_habit_tree_to(result)" : "result";
  return String.raw`call_args = [${conv}]
            t0 = ${CLOCK}
            result = Solution().${spec.fn.name}(*call_args)
            us = (${CLOCK} - t0) // 1000
            shown = ${ret}`;
}

/** The whole Python program: hidden prelude, your code, then the harness that runs the cases. */
export function pythonProgram(spec: ProblemSpec, userCode: string, memoryMb: number): string {
  const helpers = HELPERS.split("@MEM@").join(String(memoryMb)).split("@STACK@").join(String(PY_STACK_MB));
  const userLines = userCode.split("\n").length;
  return (
    PYTHON_PRELUDE +
    userCode +
    "\n\n# ---- test harness (added by Zen Dojo) ----\n" +
    `_HABIT_PRE = ${PYTHON_PRELUDE_LINES}\n_HABIT_USER = ${userLines}\n` +
    helpers +
    String.raw`

def _habit_main():
    lines = sys.stdin.read().split("\n")
    n = int(lines[0])
    out = open("results.txt", "a", encoding="utf-8")
    for t in range(1, n + 1):
        sys.stdout.write("\x01CASE " + str(t - 1) + "\x02\n")  # tells the judge which case prints from here on
        sys.stdout.flush()
        try:
            args = _hjson.loads(lines[t])
            ` +
    caseBody(spec) +
    String.raw`
            text = _hjson.dumps(shown, separators=(",", ":"), default=_habit_default)
            out.write("OK\t" + text + "\t" + str(us) + "\n")
        except Exception as e:
            out.write("ERR\t" + _habit_describe(e) + "\n")
        out.flush()
        sys.stdout.flush()
        sys.stderr.flush()
    out.close()


def _habit_thread():
    code = 0
    try:
        _habit_main()
    except SystemExit as e:
        code = e.code if isinstance(e.code, int) else 0
    except BaseException:
        _htb.print_exc()
        code = 1
    try:
        sys.stdout.flush()
        sys.stderr.flush()
    except Exception:
        pass
    _hos._exit(code)


_habit_limit_memory()
for _mb in (${PY_STACK_MB}, 64, 16):
    try:
        _hthreading.stack_size(_mb * 1024 * 1024)
        _th = _hthreading.Thread(target=_habit_thread)
        _th.start()
        _th.join()
        break
    except (ValueError, RuntimeError, MemoryError):
        continue
else:
    _habit_thread()
`
  );
}
