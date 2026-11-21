import java.util.*;

class Solution {
    public int leastInterval(String[] tasks, int n) {
        if (n == 0) return tasks.length;
        int[] cnt = new int[26];
        for (String t : tasks) cnt[t.charAt(0) - 'A']++;

        PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());
        for (int c : cnt) if (c > 0) pq.add(c);

        int time = 0;
        Queue<int[]> cool = new LinkedList<>(); // [count, availableTime]

        while (!pq.isEmpty() || !cool.isEmpty()) {
            time++;
            if (!cool.isEmpty() && cool.peek()[1] <= time) {
                pq.add(cool.poll()[0]);
            }
            if (!pq.isEmpty()) {
                int c = pq.poll();
                if (c - 1 > 0) {
                    cool.add(new int[]{c - 1, time + n + 1});
                }
            }
        }
        return time;
    }
}
