import java.util.*;

class MedianFinder {
    private final PriorityQueue<Integer> lo = new PriorityQueue<>(Collections.reverseOrder());
    private final PriorityQueue<Integer> hi = new PriorityQueue<>();

    public MedianFinder() {}

    public void addNum(int num) {
        lo.add(num);
        hi.add(lo.poll());
        if (hi.size() > lo.size()) {
            lo.add(hi.poll());
        }
    }

    public double findMedian() {
        if (lo.size() > hi.size()) return (double) lo.peek();
        return ((double) lo.peek() + hi.peek()) / 2.0;
    }
}
