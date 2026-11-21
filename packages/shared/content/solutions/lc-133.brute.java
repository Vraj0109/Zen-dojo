import java.util.*;

class Solution {
    public Node cloneGraph(Node node) {
        if (node == null) return null;
        Map<Node, Node> copies = new HashMap<>();
        Queue<Node> q = new LinkedList<>();

        copies.put(node, new Node(node.val));
        q.add(node);

        while (!q.isEmpty()) {
            Node cur = q.poll();
            for (Node neighbor : cur.neighbors) {
                if (!copies.containsKey(neighbor)) {
                    copies.put(neighbor, new Node(neighbor.val));
                    q.add(neighbor);
                }
                copies.get(cur).neighbors.add(copies.get(neighbor));
            }
        }
        return copies.get(node);
    }
}
