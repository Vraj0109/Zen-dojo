import { usesNodes, type DesignSpec, type JudgeLang, type ProblemSpec, type Ty } from "./types";

const CPP_LIST_DOC = `/**
 * Definition for singly-linked list (already defined for you).
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
`;
const CPP_TREE_DOC = `/**
 * Definition for a binary tree node (already defined for you).
 * struct TreeNode {
 *     int val;
 *     TreeNode *left;
 *     TreeNode *right;
 *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
 *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
 * };
 */
`;
const JAVA_LIST_DOC = `/**
 * Definition for singly-linked list (already defined for you).
 * class ListNode { int val; ListNode next; ListNode(int val) {...} ListNode(int val, ListNode next) {...} }
 */
`;
const JAVA_TREE_DOC = `/**
 * Definition for a binary tree node (already defined for you).
 * class TreeNode { int val; TreeNode left, right; TreeNode(int val) {...} TreeNode(int val, TreeNode left, TreeNode right) {...} }
 */
`;

const CPP: Record<Ty, string> = {
  list: "ListNode*",
  tree: "TreeNode*",
  int: "int",
  long: "long long",
  double: "double",
  bool: "bool",
  string: "string",
  "int[]": "vector<int>",
  "long[]": "vector<long long>",
  "bool[]": "vector<bool>",
  "string[]": "vector<string>",
  "int[][]": "vector<vector<int>>",
  "string[][]": "vector<vector<string>>",
};

const JAVA: Record<Ty, string> = {
  list: "ListNode",
  tree: "TreeNode",
  int: "int",
  long: "long",
  double: "double",
  bool: "boolean",
  string: "String",
  "int[]": "int[]",
  "long[]": "long[]",
  "bool[]": "boolean[]",
  "string[]": "String[]",
  "int[][]": "int[][]",
  "string[][]": "String[][]",
};

export const cppType = (t: Ty) => CPP[t];
export const javaType = (t: Ty) => JAVA[t];

/** The C++ parameter type: containers by reference, like LeetCode. */
const cppParam = (t: Ty) => (t.endsWith("]") ? `${CPP[t]}&` : CPP[t]);

/**
 * The starter code for a problem: everything is written except the body of the function, which has a comment
 * where your code goes. Test code is added around it when you run (see apps/web/lib/judge/harness.ts).
 */
export function templateFor(spec: ProblemSpec, lang: JudgeLang): string {
  if (spec.design) return designTemplate(spec.design, lang);
  const { name, params, returns } = spec.fn;
  const nodes = usesNodes(spec);
  const cppDocs = (nodes.list ? CPP_LIST_DOC : "") + (nodes.tree ? CPP_TREE_DOC : "");
  const javaDocs = (nodes.list ? JAVA_LIST_DOC : "") + (nodes.tree ? JAVA_TREE_DOC : "");
  switch (lang) {
    case "cpp":
      return `${cppDocs}class Solution {
public:
    ${CPP[returns]} ${name}(${params.map((p) => `${cppParam(p.type)} ${p.name}`).join(", ")}) {
        // Write your code here

    }
};
`;
    case "java":
      return `${javaDocs}class Solution {
    public ${JAVA[returns]} ${name}(${params.map((p) => `${JAVA[p.type]} ${p.name}`).join(", ")}) {
        // Write your code here

    }
}
`;
    case "javascript":
      return `/**
${params.map((p) => ` * @param {${jsDoc(p.type)}} ${p.name}`).join("\n")}
 * @return {${jsDoc(returns)}}
 */
function ${name}(${params.map((p) => p.name).join(", ")}) {
    // Write your code here

}
`;
  }
}

/** The starter for a design-a-class problem: the class with its constructor and methods, bodies empty. */
function designTemplate(d: DesignSpec, lang: JudgeLang): string {
  const body = "        // Write your code here\n\n    }";
  const join = (parts: string[]) => parts.join("\n\n");
  switch (lang) {
    case "cpp": {
      const ret = (m: DesignSpec["methods"][number]) => (m.returns === "void" ? "void" : CPP[m.returns]);
      const params = (ps: { name: string; type: Ty }[]) => ps.map((p) => `${cppParam(p.type)} ${p.name}`).join(", ");
      const methods = d.methods.map((m) => `    ${ret(m)} ${m.name}(${params(m.params)}) {\n${body}`);
      return `class ${d.className} {\npublic:\n${join([`    ${d.className}(${params(d.ctor)}) {\n${body}`, ...methods])}\n};\n`;
    }
    case "java": {
      const ret = (m: DesignSpec["methods"][number]) => (m.returns === "void" ? "void" : JAVA[m.returns]);
      const params = (ps: { name: string; type: Ty }[]) => ps.map((p) => `${JAVA[p.type]} ${p.name}`).join(", ");
      const methods = d.methods.map((m) => `    public ${ret(m)} ${m.name}(${params(m.params)}) {\n${body}`);
      return `class ${d.className} {\n${join([`    public ${d.className}(${params(d.ctor)}) {\n${body}`, ...methods])}\n}\n`;
    }
    case "javascript": {
      const params = (ps: { name: string }[]) => ps.map((p) => p.name).join(", ");
      const methods = d.methods.map((m) => `    ${m.name}(${params(m.params)}) {\n${body}`);
      return `class ${d.className} {\n${join([`    constructor(${params(d.ctor)}) {\n${body}`, ...methods])}\n}\n`;
    }
  }
}

function jsDoc(t: Ty): string {
  if (t === "list") return "ListNode";
  if (t === "tree") return "TreeNode";
  const base = t.replace(/\[\]/g, "");
  const js = base === "string" ? "string" : base === "bool" ? "boolean" : "number";
  return js + "[]".repeat((t.match(/\[\]/g) ?? []).length);
}
