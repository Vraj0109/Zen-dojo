import { usesNodes, type ProblemSpec } from "@habit/shared";

// Linked lists and binary trees. LeetCode gives you ListNode and TreeNode; so do we. In tests a list is a JSON array
// ([1,2,3]) and a tree is the level-order array with null for a missing child ([1,null,2,3]). The pieces here are
// added around your code by harness.ts.

/** C++: includes and the node structs, placed BEFORE your code (your code uses them). */
export function cppPrelude(spec: ProblemSpec): string {
  const n = usesNodes(spec);
  if (!n.list && !n.tree) return "";
  return (
    String.raw`
#include <bits/stdc++.h>
using namespace std;
` +
    (n.list
      ? String.raw`
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
`
      : "") +
    (n.tree
      ? String.raw`
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
`
      : "") +
    "\n"
  );
}

/** C++: readers and writers, placed after the generic ones. */
export function cppNodeIo(spec: ProblemSpec): string {
  const n = usesNodes(spec);
  return (
    (n.list
      ? String.raw`
static void habitRead(HabitReader& r, ListNode*& head) {
    std::vector<int> v; habitRead(r, v);
    ListNode dummy; ListNode* tail = &dummy;
    for (int x : v) { tail->next = new ListNode(x); tail = tail->next; }
    head = dummy.next;
}
static void habitWrite(std::ostream& o, ListNode* head) {
    o << '[';
    for (bool first = true; head; head = head->next, first = false) { if (!first) o << ','; o << head->val; }
    o << ']';
}
`
      : "") +
    (n.tree
      ? String.raw`
static void habitRead(HabitReader& r, TreeNode*& root) {
    r.expect('['); std::vector<std::pair<bool, int>> v;
    if (r.peek() != ']') {
        while (true) {
            r.ws();
            if (r.s.compare(r.i, 4, "null") == 0) { r.i += 4; v.push_back({false, 0}); }
            else { int x; habitRead(r, x); v.push_back({true, x}); }
            if (r.peek() == ',') { r.i++; continue; }
            break;
        }
    }
    r.expect(']');
    root = nullptr;
    if (v.empty() || !v[0].first) return;
    root = new TreeNode(v[0].second);
    std::queue<TreeNode*> q; q.push(root); size_t i = 1;
    while (!q.empty() && i < v.size()) {
        TreeNode* n = q.front(); q.pop();
        if (i < v.size()) { if (v[i].first) { n->left = new TreeNode(v[i].second); q.push(n->left); } i++; }
        if (i < v.size()) { if (v[i].first) { n->right = new TreeNode(v[i].second); q.push(n->right); } i++; }
    }
}
static void habitWrite(std::ostream& o, TreeNode* root) {
    std::vector<std::string> out;
    std::queue<TreeNode*> q; if (root) q.push(root);
    while (!q.empty()) {
        TreeNode* n = q.front(); q.pop();
        if (!n) { out.push_back("null"); continue; }
        out.push_back(std::to_string(n->val)); q.push(n->left); q.push(n->right);
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    o << '[';
    for (size_t k = 0; k < out.size(); k++) { if (k) o << ','; o << out[k]; }
    o << ']';
}
`
      : "")
  );
}

/** Java: the node classes, as extra files next to Solution.java. */
export function javaSupportFiles(spec: ProblemSpec): Record<string, string> {
  const n = usesNodes(spec);
  const files: Record<string, string> = {};
  if (n.list) {
    files["ListNode.java"] = `public class ListNode {
    public int val;
    public ListNode next;
    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
`;
  }
  if (n.tree) {
    files["TreeNode.java"] = `public class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
`;
  }
  return files;
}

/** Java: conversions used by Main, placed inside the Main class. Only added when the problem uses nodes. */
export function javaNodeHelpers(spec: ProblemSpec): string {
  const n = usesNodes(spec);
  return (
    (n.list
      ? String.raw`
    static ListNode list(Object o) {
        ListNode dummy = new ListNode(0), tail = dummy;
        for (Object x : (List<?>) o) { tail.next = new ListNode(toInt(x)); tail = tail.next; }
        return dummy.next;
    }
`
      : "") +
    (n.tree
      ? String.raw`
    static TreeNode tree(Object o) {
        List<?> v = (List<?>) o;
        if (v.isEmpty() || v.get(0) == null) return null;
        TreeNode root = new TreeNode(toInt(v.get(0)));
        ArrayDeque<TreeNode> q = new ArrayDeque<>(); q.add(root); int k = 1;
        while (!q.isEmpty() && k < v.size()) {
            TreeNode n = q.poll();
            if (k < v.size()) { if (v.get(k) != null) { n.left = new TreeNode(toInt(v.get(k))); q.add(n.left); } k++; }
            if (k < v.size()) { if (v.get(k) != null) { n.right = new TreeNode(toInt(v.get(k))); q.add(n.right); } k++; }
        }
        return root;
    }
`
      : "")
  );
}

/** Java: the part of the JSON writer that prints a list or tree result. Goes first in `wr`'s if-chain. */
export function javaNodeWriter(spec: ProblemSpec): string {
  const n = usesNodes(spec);
  return (
    (n.list
      ? String.raw`
        if (o instanceof ListNode) {
            b.append('[');
            for (ListNode p = (ListNode) o; p != null; p = p.next) { b.append(p.val); if (p.next != null) b.append(','); }
            b.append(']');
            return;
        }
`
      : "") +
    (n.tree
      ? String.raw`
        if (o instanceof TreeNode) {
            List<String> out = new ArrayList<>(); LinkedList<TreeNode> q = new LinkedList<>(); q.add((TreeNode) o); // LinkedList allows null children
            while (!q.isEmpty()) {
                TreeNode n = q.poll();
                if (n == null) { out.add("null"); continue; }
                out.add(String.valueOf(n.val)); q.add(n.left); q.add(n.right);
            }
            while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
            b.append('[').append(String.join(",", out)).append(']');
            return;
        }
`
      : "")
  );
}

/** JavaScript: node constructors and converters, placed BEFORE your code. */
export function jsNodePrelude(spec: ProblemSpec): string {
  const n = usesNodes(spec);
  return (
    (n.list
      ? String.raw`
function ListNode(val, next) { this.val = val === undefined ? 0 : val; this.next = next === undefined ? null : next; }
function __listFrom(a) { const d = new ListNode(0); let t = d; for (const x of a) { t.next = new ListNode(x); t = t.next; } return d.next; }
function __listTo(h) { const o = []; for (; h; h = h.next) o.push(h.val); return o; }
`
      : "") +
    (n.tree
      ? String.raw`
function TreeNode(val, left, right) { this.val = val === undefined ? 0 : val; this.left = left === undefined ? null : left; this.right = right === undefined ? null : right; }
function __treeFrom(a) {
    if (!a.length || a[0] === null) return null;
    const root = new TreeNode(a[0]); const q = [root]; let k = 1, qi = 0;
    while (qi < q.length && k < a.length) {
        const n = q[qi++];
        if (k < a.length) { if (a[k] !== null) { n.left = new TreeNode(a[k]); q.push(n.left); } k++; }
        if (k < a.length) { if (a[k] !== null) { n.right = new TreeNode(a[k]); q.push(n.right); } k++; }
    }
    return root;
}
function __treeTo(r) {
    const out = []; const q = r ? [r] : [];
    for (let i = 0; i < q.length; i++) { const n = q[i]; if (!n) { out.push(null); continue; } out.push(n.val); q.push(n.left); q.push(n.right); }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
}
`
      : "")
  );
}

/** JavaScript: how to turn one JSON argument into the value your function receives, and the result back to JSON. */
export const jsArg = (type: string, expr: string) => (type === "list" ? `__listFrom(${expr})` : type === "tree" ? `__treeFrom(${expr})` : expr);
export const jsResult = (type: string, expr: string) => (type === "list" ? `__listTo(${expr})` : type === "tree" ? `__treeTo(${expr})` : expr);
