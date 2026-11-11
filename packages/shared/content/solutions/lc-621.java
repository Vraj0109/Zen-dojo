import java.util.*;

class Solution {
    public int leastInterval(String[] tasks, int n) {
        int[] cnt = new int[26];
        for (String t : tasks) cnt[t.charAt(0) - 'A']++;
        int f = 0;
        for (int c : cnt) if (c > f) f = c;
        int ties = 0;
        for (int c : cnt) if (c == f) ties++;
        return Math.max(tasks.length, (f - 1) * (n + 1) + ties);
    }
}