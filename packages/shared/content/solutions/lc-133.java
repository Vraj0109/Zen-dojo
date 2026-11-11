import java.util.*;

class Solution {
    private final Map<Node, Node> copies = new HashMap<>();

    public Node cloneGraph(Node node) {
        if (node == null) return null;
        if (copies.containsKey(node)) return copies.get(node);
        Node copy = new Node(node.val);
        copies.put(node, copy);
        for (Node neighbor : node.neighbors) {
            copy.neighbors.add(cloneGraph(neighbor));
        }
        return copy;
    }
}
