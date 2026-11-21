import java.util.*;

class AllOne {
    private final Map<String, Integer> counts = new HashMap<>();

    public AllOne() {}

    public void inc(String key) {
        counts.put(key, counts.getOrDefault(key, 0) + 1);
    }

    public void dec(String key) {
        int c = counts.get(key) - 1;
        if (c == 0) {
            counts.remove(key);
        } else {
            counts.put(key, c);
        }
    }

    public String getMaxKey() {
        if (counts.isEmpty()) return "";
        String maxKey = "";
        int maxVal = Integer.MIN_VALUE;
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (entry.getValue() > maxVal) {
                maxVal = entry.getValue();
                maxKey = entry.getKey();
            }
        }
        return maxKey;
    }

    public String getMinKey() {
        if (counts.isEmpty()) return "";
        String minKey = "";
        int minVal = Integer.MAX_VALUE;
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (entry.getValue() < minVal) {
                minVal = entry.getValue();
                minKey = entry.getKey();
            }
        }
        return minKey;
    }
}
