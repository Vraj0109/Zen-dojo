import java.util.*;

class HitCounter {
    private final List<Integer> hits = new ArrayList<>();

    public HitCounter() {}

    public void hit(int timestamp) {
        hits.add(timestamp);
    }

    public int getHits(int timestamp) {
        int cnt = 0;
        for (int t : hits) {
            if (t > timestamp - 300 && t <= timestamp) {
                cnt++;
            }
        }
        return cnt;
    }
}
