import java.util.*;

class HitCounter {
    private final Deque<Integer> q = new ArrayDeque<>();

    public HitCounter() {}

    public void hit(int timestamp) {
        q.add(timestamp);
    }

    public int getHits(int timestamp) {
        while (!q.isEmpty() && q.peek() <= timestamp - 300) {
            q.poll();
        }
        return q.size();
    }
}
