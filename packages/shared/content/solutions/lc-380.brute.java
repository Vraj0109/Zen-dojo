import java.util.*;

class RandomizedSet {
    private final List<Integer> items = new ArrayList<>();
    private final Random rand = new Random();

    public RandomizedSet() {}

    public boolean insert(int val) {
        for (int x : items) {
            if (x == val) return false;
        }
        items.add(val);
        return true;
    }

    public boolean remove(int val) {
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i) == val) {
                items.remove(i);
                return true;
            }
        }
        return false;
    }

    public int getRandom() {
        return items.get(rand.nextInt(items.size()));
    }
}
