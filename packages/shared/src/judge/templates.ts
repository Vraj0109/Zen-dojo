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

const PY_LIST_DOC = `# Definition for singly-linked list (already defined for you).
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
`;
const PY_TREE_DOC = `# Definition for a binary tree node (already defined for you).
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
`;

const PY: Record<Ty, string> = {
  list: "Optional[ListNode]",
  tree: "Optional[TreeNode]",
  int: "int",
  long: "int",
  double: "float",
  bool: "bool",
  string: "str",
  "int[]": "List[int]",
  "long[]": "List[int]",
  "bool[]": "List[bool]",
  "string[]": "List[str]",
  "int[][]": "List[List[int]]",
  "string[][]": "List[List[str]]",
};

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
export const pythonType = (t: Ty) => PY[t];

/** The C++ parameter type: containers by reference, like LeetCode. */
const cppParam = (t: Ty) => (t.endsWith("]") ? `${CPP[t]}&` : CPP[t]);

/**
 * The starter code for a problem: everything is written except the body of the function, which has a comment
 * where your code goes. Test code is added around it when you run (see apps/web/lib/judge/harness.ts).
 */
export function templateFor(spec: ProblemSpec, lang: JudgeLang): string {
  if (spec.id === "lc-297") {
    switch (lang) {
      case "cpp":
        return `${CPP_TREE_DOC}class Codec {\npublic:\n    // Encodes a tree to a single string.\n    string serialize(TreeNode* root) {\n        // Write your code here\n\n    }\n\n    // Decodes your encoded data to tree.\n    TreeNode* deserialize(string data) {\n        // Write your code here\n\n    }\n};\n`;
      case "java":
        return `${JAVA_TREE_DOC}public class Codec {\n    // Encodes a tree to a single string.\n    public String serialize(TreeNode root) {\n        // Write your code here\n\n    }\n\n    // Decodes your encoded data to tree.\n    public TreeNode deserialize(String data) {\n        // Write your code here\n\n    }\n}\n`;
      case "python":
        return `${PY_TREE_DOC}class Codec:\n    def serialize(self, root: Optional[TreeNode]) -> str:\n        """Encodes a tree to a single string."""\n        # Write your code here\n        pass\n\n    def deserialize(self, data: str) -> Optional[TreeNode]:\n        """Decodes your encoded data to tree."""\n        # Write your code here\n        pass\n`;
      case "javascript":
        return `/**\n * Definition for a binary tree node.\n * function TreeNode(val) {\n *     this.val = val;\n *     this.left = this.right = null;\n * }\n */\n\n/**\n * Encodes a tree to a single string.\n *\n * @param {TreeNode} root\n * @return {string}\n */\nfunction serialize(root) {\n    // Write your code here\n\n}\n\n/**\n * Decodes your encoded data to tree.\n *\n * @param {string} data\n * @return {TreeNode}\n */\nfunction deserialize(data) {\n    // Write your code here\n\n}\n`;
    }
  }

  if (spec.id === "lc-133") {
    switch (lang) {
      case "cpp":
        return `/**\n * Definition for a Node (already defined for you).\n * class Node {\n * public:\n *     int val;\n *     vector<Node*> neighbors;\n *     Node() : val(0), neighbors() {}\n *     Node(int _val) : val(_val), neighbors() {}\n *     Node(int _val, vector<Node*> _neighbors) : val(_val), neighbors(_neighbors) {}\n * };\n */\nclass Solution {\npublic:\n    Node* cloneGraph(Node* node) {\n        // Write your code here\n\n    }\n};\n`;
      case "java":
        return `/**\n * Definition for a Node (already defined for you).\n * class Node {\n *     public int val;\n *     public List<Node> neighbors;\n *     public Node() { val = 0; neighbors = new ArrayList<Node>(); }\n *     public Node(int _val) { val = _val; neighbors = new ArrayList<Node>(); }\n *     public Node(int _val, ArrayList<Node> _neighbors) { val = _val; neighbors = _neighbors; }\n * }\n */\nclass Solution {\n    public Node cloneGraph(Node node) {\n        // Write your code here\n\n    }\n}\n`;
      case "python":
        return `# Definition for a Node (already defined for you).\n# class Node:\n#     def __init__(self, val=0, neighbors=None):\n#         self.val = val\n#         self.neighbors = neighbors if neighbors is not None else []\n\nclass Solution:\n    def cloneGraph(self, node: Optional[Node]) -> Optional[Node]:\n        # Write your code here\n        pass\n`;
      case "javascript":
        return `/**\n * // Definition for a Node.\n * function Node(val, neighbors) {\n *    this.val = val === undefined ? 0 : val;\n *    this.neighbors = neighbors === undefined ? [] : neighbors;\n * };\n */\n\n/**\n * @param {Node} node\n * @return {Node}\n */\nfunction cloneGraph(node) {\n    // Write your code here\n\n}\n`;
    }
  }

  const nodes = usesNodes(spec);
  const cppDocs = (nodes.list ? CPP_LIST_DOC : "") + (nodes.tree ? CPP_TREE_DOC : "");
  const javaDocs = (nodes.list ? JAVA_LIST_DOC : "") + (nodes.tree ? JAVA_TREE_DOC : "");
  const pyDocs = (nodes.list ? PY_LIST_DOC : "") + (nodes.tree ? PY_TREE_DOC : "");
  if (spec.design) {
    const t = designTemplate(spec.design, lang);
    return lang === "cpp" ? cppDocs + t : lang === "java" ? javaDocs + t : lang === "python" ? pyDocs + t : t;
  }
  const { name, params, returns } = spec.fn;
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
    case "python":
      return `${pyDocs}class Solution:
    def ${name}(self${params.map((p) => `, ${p.name}: ${PY[p.type]}`).join("")}) -> ${PY[returns]}:
        # Write your code here
        pass
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
    case "python": {
      const params = (ps: { name: string; type: Ty }[]) => ps.map((p) => `, ${p.name}: ${PY[p.type]}`).join("");
      const pyBody = "        # Write your code here\n        pass";
      const methods = d.methods.map((m) => `    def ${m.name}(self${params(m.params)})${m.returns === "void" ? "" : ` -> ${PY[m.returns]}`}:\n${pyBody}`);
      return `class ${d.className}:\n${join([`    def __init__(self${params(d.ctor)}):\n${pyBody}`, ...methods])}\n`;
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
