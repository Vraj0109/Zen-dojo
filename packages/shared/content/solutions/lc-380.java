import java.util.*;

class RandomizedSet {
    private final List<Integer> items = new ArrayList<>();
    private final Map<Integer, Integer> where = new HashMap<>();
    private final Random rand = new Random();

    public RandomizedSet() {}

    public boolean insert(int val) {
        if (where.containsKey(val)) return false;
        where.put(val, items.size());
        items.add(val);
        return true;
    }

    public boolean remove(int val) {
        Integer idx = where.get(val);
        if (idx == null) return false;
        int last = items.get(items.size() - 1);
        items.set(idx, last);
        where.put(last, idx);
        items.remove(items.size() - 1);
        where.remove(val);
        return true;
    }

    public int getRandom() {
        return items.get(rand.nextInt(items.size()));
    }
}
