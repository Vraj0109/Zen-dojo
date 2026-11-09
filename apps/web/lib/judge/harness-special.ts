import type { ProblemSpec } from "@habit/shared";

/**
 * Custom harnesses for special problems that require deep node graph validation,
 * custom serialization codecs, or stateful iterators.
 */

export function isSpecialProblem(id: string): boolean {
  return id === "lc-297" || id === "lc-133";
}

/** C++ prelude additions for special problems (e.g. Node definition for lc-133). */
export function specialCppPrelude(spec: ProblemSpec): string {
  if (spec.id === "lc-133") {
    return String.raw`
class Node {
public:
    int val;
    std::vector<Node*> neighbors;
    Node() : val(0), neighbors() {}
    Node(int _val) : val(_val), neighbors() {}
    Node(int _val, std::vector<Node*> _neighbors) : val(_val), neighbors(_neighbors) {}
};
`;
  }
  return "";
}

/** C++ graph builder and deep-copy validator for lc-133. */
export function specialCppNodeIo(spec: ProblemSpec): string {
  if (spec.id === "lc-133") {
    return String.raw`
static Node* habitBuildGraph(const std::vector<std::vector<int>>& adj) {
    if (adj.empty()) return nullptr;
    int n = (int)adj.size();
    std::vector<Node*> nodes(n + 1, nullptr);
    for (int i = 1; i <= n; i++) nodes[i] = new Node(i);
    for (int i = 0; i < n; i++) {
        for (int neighbor : adj[i]) {
            if (neighbor >= 1 && neighbor <= n) {
                nodes[i + 1]->neighbors.push_back(nodes[neighbor]);
            }
        }
    }
    return nodes[1];
}

static std::vector<std::vector<int>> habitSerializeGraph(Node* root, const std::unordered_set<Node*>& origNodes) {
    if (!root) return {};
    std::unordered_map<int, Node*> visited;
    std::queue<Node*> q;
    q.push(root);
    visited[root->val] = root;
    int maxVal = root->val;

    while (!q.empty()) {
        Node* curr = q.front();
        q.pop();
        if (origNodes.count(curr)) {
            throw std::runtime_error("Cloned graph contains original node pointer (not a deep copy)");
        }
        maxVal = std::max(maxVal, curr->val);
        for (Node* nb : curr->neighbors) {
            if (!nb) continue;
            if (visited.find(nb->val) == visited.end()) {
                visited[nb->val] = nb;
                q.push(nb);
            } else if (visited[nb->val] != nb) {
                throw std::runtime_error("Graph contains conflicting node pointers for same value");
            }
        }
    }

    std::vector<std::vector<int>> adj(maxVal);
    for (int i = 1; i <= maxVal; i++) {
        if (visited.count(i)) {
            for (Node* nb : visited[i]->neighbors) {
                if (nb) adj[i - 1].push_back(nb->val);
            }
            std::sort(adj[i - 1].begin(), adj[i - 1].end());
        }
    }
    return adj;
}
`;
  }
  return "";
}

/** C++ per-case runner body for special problems. */
export function specialCppCase(spec: ProblemSpec): string {
  if (spec.id === "lc-297") {
    return String.raw`r.expect('[');
            TreeNode* root = nullptr;
            habitRead(r, root);
            r.expect(']');
            auto t0 = std::chrono::steady_clock::now();
            Codec codec;
            std::string serialized = codec.serialize(root);
            TreeNode* deserialized = codec.deserialize(serialized);
            auto t1 = std::chrono::steady_clock::now();
            std::ostringstream o;
            habitWrite(o, deserialized);
            long long micros = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();`;
  }

  if (spec.id === "lc-133") {
    return String.raw`r.expect('[');
            std::vector<std::vector<int>> adj;
            habitRead(r, adj);
            r.expect(']');

            Node* orig = habitBuildGraph(adj);
            std::unordered_set<Node*> origNodes;
            if (orig) {
                std::queue<Node*> q;
                q.push(orig);
                origNodes.insert(orig);
                while (!q.empty()) {
                    Node* curr = q.front(); q.pop();
                    for (Node* nb : curr->neighbors) {
                        if (nb && origNodes.insert(nb).second) q.push(nb);
                    }
                }
            }

            auto t0 = std::chrono::steady_clock::now();
            Node* cloned = Solution().cloneGraph(orig);
            auto t1 = std::chrono::steady_clock::now();

            std::vector<std::vector<int>> result = habitSerializeGraph(cloned, origNodes);
            std::ostringstream o;
            habitWrite(o, result);
            long long micros = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();`;
  }

  throw new Error(`Unknown special problem ${spec.id}`);
}

/** Java support files (e.g. Node.java for lc-133). */
export function specialJavaSupportFiles(spec: ProblemSpec): Record<string, string> {
  const files: Record<string, string> = {};
  if (spec.id === "lc-133") {
    files["Node.java"] = `import java.util.*;

public class Node {
    public int val;
    public List<Node> neighbors;
    public Node() { val = 0; neighbors = new ArrayList<Node>(); }
    public Node(int _val) { val = _val; neighbors = new ArrayList<Node>(); }
    public Node(int _val, ArrayList<Node> _neighbors) { val = _val; neighbors = _neighbors; }
}
`;
  }
  return files;
}

/** Java helper methods placed in Main for special problems. */
export function specialJavaNodeHelpers(spec: ProblemSpec): string {
  if (spec.id === "lc-133") {
    return String.raw`
    static Node buildGraph(int[][] adj) {
        if (adj.length == 0) return null;
        int n = adj.length;
        Node[] nodes = new Node[n + 1];
        for (int i = 1; i <= n; i++) nodes[i] = new Node(i);
        for (int i = 0; i < n; i++) {
            for (int nb : adj[i]) {
                if (nb >= 1 && nb <= n) nodes[i + 1].neighbors.add(nodes[nb]);
            }
        }
        return nodes[1];
    }

    static int[][] serializeGraph(Node root, Set<Node> origNodes) {
        if (root == null) return new int[0][0];
        Map<Integer, Node> visited = new HashMap<>();
        ArrayDeque<Node> q = new ArrayDeque<>();
        q.add(root);
        visited.put(root.val, root);
        int maxVal = root.val;

        while (!q.isEmpty()) {
            Node curr = q.poll();
            if (origNodes.contains(curr)) throw new RuntimeException("Cloned graph contains original node pointer");
            maxVal = Math.max(maxVal, curr.val);
            if (curr.neighbors != null) {
                for (Node nb : curr.neighbors) {
                    if (nb == null) continue;
                    if (!visited.containsKey(nb.val)) {
                        visited.put(nb.val, nb);
                        q.add(nb);
                    } else if (visited.get(nb.val) != nb) {
                        throw new RuntimeException("Conflicting node pointers");
                    }
                }
            }
        }

        int[][] adj = new int[maxVal][];
        for (int i = 1; i <= maxVal; i++) {
            Node node = visited.get(i);
            if (node == null || node.neighbors == null) {
                adj[i - 1] = new int[0];
            } else {
                List<Integer> nbs = new ArrayList<>();
                for (Node nb : node.neighbors) if (nb != null) nbs.add(nb.val);
                Collections.sort(nbs);
                adj[i - 1] = new int[nbs.size()];
                for (int j = 0; j < nbs.size(); j++) adj[i - 1][j] = nbs.get(j);
            }
        }
        return adj;
    }
`;
  }
  return "";
}

/** Java per-case runner body for special problems. */
export function specialJavaCase(spec: ProblemSpec): string {
  if (spec.id === "lc-297") {
    return String.raw`List<?> a = (List<?>) val();
                TreeNode root = tree(a.get(0));
                long t0 = System.nanoTime();
                Codec codec = new Codec();
                String serialized = codec.serialize(root);
                TreeNode deserialized = codec.deserialize(serialized);
                long us = (System.nanoTime() - t0) / 1000;
                StringBuilder b = new StringBuilder(); wr(b, deserialized);`;
  }

  if (spec.id === "lc-133") {
    return String.raw`List<?> a = (List<?>) val();
                int[][] adj = ints2(a.get(0));
                Node orig = buildGraph(adj);
                Set<Node> origNodes = new HashSet<>();
                if (orig != null) {
                    ArrayDeque<Node> q = new ArrayDeque<>();
                    q.add(orig);
                    origNodes.add(orig);
                    while (!q.isEmpty()) {
                        Node curr = q.poll();
                        if (curr.neighbors != null) {
                            for (Node nb : curr.neighbors) {
                                if (nb != null && origNodes.add(nb)) q.add(nb);
                            }
                        }
                    }
                }
                long t0 = System.nanoTime();
                Node cloned = new Solution().cloneGraph(orig);
                long us = (System.nanoTime() - t0) / 1000;
                int[][] resAdj = serializeGraph(cloned, origNodes);
                StringBuilder b = new StringBuilder(); wr(b, resAdj);`;
  }

  throw new Error(`Unknown special problem ${spec.id}`);
}

/** JavaScript prelude for special problems. */
export function specialJsNodePrelude(spec: ProblemSpec): string {
  if (spec.id === "lc-133") {
    return String.raw`
function Node(val, neighbors) {
    this.val = val === undefined ? 0 : val;
    this.neighbors = neighbors === undefined ? [] : neighbors;
}

function __buildGraph(adj) {
    if (!adj || !adj.length) return null;
    const nodes = [];
    for (let i = 1; i <= adj.length; i++) nodes[i] = new Node(i);
    for (let i = 0; i < adj.length; i++) {
        for (const nb of adj[i]) {
            if (nb >= 1 && nb <= adj.length) nodes[i + 1].neighbors.push(nodes[nb]);
        }
    }
    return nodes[1];
}

function __serializeGraph(root, origSet) {
    if (!root) return [];
    const visited = new Map();
    const q = [root];
    visited.set(root.val, root);
    let maxVal = root.val;

    while (q.length > 0) {
        const curr = q.shift();
        if (origSet.has(curr)) throw new Error("Cloned graph contains original node pointer");
        maxVal = Math.max(maxVal, curr.val);
        for (const nb of (curr.neighbors || [])) {
            if (!nb) continue;
            if (!visited.has(nb.val)) {
                visited.set(nb.val, nb);
                q.push(nb);
            } else if (visited.get(nb.val) !== nb) {
                throw new Error("Conflicting node pointers");
            }
        }
    }

    const adj = [];
    for (let i = 1; i <= maxVal; i++) {
        const node = visited.get(i);
        if (!node || !node.neighbors) {
            adj.push([]);
        } else {
            const nbs = node.neighbors.filter(Boolean).map((n) => n.val).sort((a, b) => a - b);
            adj.push(nbs);
        }
    }
    return adj;
}
`;
  }
  return "";
}

/** JavaScript per-case runner body for special problems. */
export function specialJsCase(spec: ProblemSpec): string {
  if (spec.id === "lc-297") {
    return String.raw`const root = __treeFrom(args[0]);
        const t0 = process.hrtime.bigint();
        let res;
        if (typeof Codec !== 'undefined') {
            const codec = new Codec();
            res = codec.deserialize(codec.serialize(root));
        } else {
            res = deserialize(serialize(root));
        }
        const us = Number((process.hrtime.bigint() - t0) / 1000n);
        const shown = __treeTo(res);`;
  }

  if (spec.id === "lc-133") {
    return String.raw`const adj = args[0];
        const orig = __buildGraph(adj);
        const origSet = new Set();
        if (orig) {
            const q = [orig];
            origSet.add(orig);
            while (q.length > 0) {
                const curr = q.shift();
                for (const nb of (curr.neighbors || [])) {
                    if (nb && !origSet.has(nb)) { origSet.add(nb); q.push(nb); }
                }
            }
        }
        const t0 = process.hrtime.bigint();
        let cloned;
        if (typeof Solution !== 'undefined') {
            cloned = new Solution().cloneGraph(orig);
        } else {
            cloned = cloneGraph(orig);
        }
        const us = Number((process.hrtime.bigint() - t0) / 1000n);
        const shown = __serializeGraph(cloned, origSet);`;
  }

  throw new Error(`Unknown special problem ${spec.id}`);
}
