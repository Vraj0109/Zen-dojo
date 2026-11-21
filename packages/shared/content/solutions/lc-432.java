import java.util.*;

class AllOne {
    private static class Bucket {
        int count;
        Set<String> keys = new HashSet<>();
        Bucket prev, next;
        Bucket(int c) { count = c; }
    }

    private final Map<String, Bucket> keyToBucket = new HashMap<>();
    private final Bucket head = new Bucket(0);
    private final Bucket tail = new Bucket(0);

    public AllOne() {
        head.next = tail;
        tail.prev = head;
    }

    private Bucket insertAfter(Bucket prev, int count) {
        Bucket b = new Bucket(count);
        b.next = prev.next;
        b.prev = prev;
        prev.next.prev = b;
        prev.next = b;
        return b;
    }

    private void removeBucket(Bucket b) {
        b.prev.next = b.next;
        b.next.prev = b.prev;
    }

    public void inc(String key) {
        Bucket cur = keyToBucket.get(key);
        if (cur == null) {
            Bucket first = head.next;
            if (first == tail || first.count != 1) {
                first = insertAfter(head, 1);
            }
            first.keys.add(key);
            keyToBucket.put(key, first);
        } else {
            Bucket next = cur.next;
            if (next == tail || next.count != cur.count + 1) {
                next = insertAfter(cur, cur.count + 1);
            }
            next.keys.add(key);
            keyToBucket.put(key, next);
            cur.keys.remove(key);
            if (cur.keys.isEmpty()) {
                removeBucket(cur);
            }
        }
    }

    public void dec(String key) {
        Bucket cur = keyToBucket.get(key);
        if (cur == null) return;
        if (cur.count == 1) {
            keyToBucket.remove(key);
        } else {
            Bucket prev = cur.prev;
            if (prev == head || prev.count != cur.count - 1) {
                prev = insertAfter(cur.prev, cur.count - 1);
            }
            prev.keys.add(key);
            keyToBucket.put(key, prev);
        }
        cur.keys.remove(key);
        if (cur.keys.isEmpty()) {
            removeBucket(cur);
        }
    }

    public String getMaxKey() {
        if (tail.prev == head) return "";
        return tail.prev.keys.iterator().next();
    }

    public String getMinKey() {
        if (head.next == tail) return "";
        return head.next.keys.iterator().next();
    }
}
