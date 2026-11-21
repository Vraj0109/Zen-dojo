import java.util.*;

class MedianFinder {
    private final List<Integer> nums = new ArrayList<>();

    public MedianFinder() {}

    public void addNum(int num) {
        nums.add(num);
    }

    public double findMedian() {
        List<Integer> copy = new ArrayList<>(nums);
        Collections.sort(copy);
        int n = copy.size();
        if (n % 2 == 1) {
            return copy.get(n / 2);
        } else {
            return (copy.get(n / 2 - 1) + (double) copy.get(n / 2)) / 2.0;
        }
    }
}
