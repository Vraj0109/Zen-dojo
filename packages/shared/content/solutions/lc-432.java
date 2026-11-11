import java.util.*;

class AllOne {
    private final Map<String, Integer> count = new HashMap<>();
    private final TreeMap<Integer, Set<String>> byCount = new TreeMap<>();

    private void move(String key, int from, int to) {
        if (from > 0) {
            Set<String> s = byCount.get(from);
            s.remove(key);
            if (s.isEmpty()) byCount.remove(from);
        }
        if (to > 0) {
            byCount.computeIfAbsent(to, k -> new LinkedHashSet<>()).add(key);
            count.put(key, to);
        } else {
            count.remove(key);
        }
    }

    public AllOne() {}

    public void inc(String key) {
        int c = count.getOrDefault(key, 0);
        move(key, c, c + 1);
    }

    public void dec(String key) {
        int c = count.get(key);
        move(key, c, c - 1);
    }

    public String getMaxKey() {
        if (byCount.isEmpty()) return "";
        return byCount.lastEntry().getValue().iterator().next();
    }

    public String getMinKey() {
        if (byCount.isEmpty()) return "";
        return byCount.firstEntry().getValue().iterator().next();
    }
}
