import java.util.*;

class LFUCache {
    private static class Node {
        int key, value, count = 1;
        Node prev, next;
        Node(int k, int v) { key = k; value = v; }
    }
    private static class DoublyLinkedList {
        Node head, tail;
        int size = 0;
        DoublyLinkedList() {
            head = new Node(0, 0);
            tail = new Node(0, 0);
            head.next = tail;
            tail.prev = head;
        }
        void addFirst(Node node) {
            node.next = head.next;
            node.prev = head;
            head.next.prev = node;
            head.next = node;
            size++;
        }
        void remove(Node node) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
            size--;
        }
        Node removeLast() {
            if (size == 0) return null;
            Node last = tail.prev;
            remove(last);
            return last;
        }
    }

    private final int cap;
    private int minCount = 0;
    private final Map<Integer, Node> entries = new HashMap<>();
    private final Map<Integer, DoublyLinkedList> byCount = new HashMap<>();

    private void touch(Node e) {
        DoublyLinkedList old = byCount.get(e.count);
        old.remove(e);
        if (old.size == 0) {
            byCount.remove(e.count);
            if (minCount == e.count) minCount++;
        }
        e.count++;
        byCount.computeIfAbsent(e.count, k -> new DoublyLinkedList()).addFirst(e);
    }

    public LFUCache(int capacity) {
        cap = capacity;
    }

    public int get(int key) {
        Node e = entries.get(key);
        if (e == null) return -1;
        touch(e);
        return e.value;
    }

    public void put(int key, int value) {
        if (cap == 0) return;
        Node e = entries.get(key);
        if (e != null) {
            e.value = value;
            touch(e);
            return;
        }
        if (entries.size() == cap) {
            DoublyLinkedList victims = byCount.get(minCount);
            Node victim = victims.removeLast();
            entries.remove(victim.key);
            if (victims.size == 0) byCount.remove(minCount);
        }
        Node newNode = new Node(key, value);
        entries.put(key, newNode);
        byCount.computeIfAbsent(1, k -> new DoublyLinkedList()).addFirst(newNode);
        minCount = 1;
    }
}
