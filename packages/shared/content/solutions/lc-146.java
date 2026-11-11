import java.util.*;

class LRUCache {
    private static class Node {
        int key, value;
        Node prev, next;
        Node(int k, int v) { key = k; value = v; }
    }
    private final int cap;
    private final Map<Integer, Node> map;
    private final Node head, tail;

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    private void addToFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    public LRUCache(int capacity) {
        cap = capacity;
        map = new HashMap<>();
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        remove(node);
        addToFront(node);
        return node.value;
    }

    public void put(int key, int value) {
        Node node = map.get(key);
        if (node != null) {
            node.value = value;
            remove(node);
            addToFront(node);
            return;
        }
        if (map.size() == cap) {
            Node victim = tail.prev;
            remove(victim);
            map.remove(victim.key);
        }
        Node newNode = new Node(key, value);
        map.put(key, newNode);
        addToFront(newNode);
    }
}
