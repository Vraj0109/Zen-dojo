import java.util.*;

class Solution {
    public int openLock(String[] deadends, String target) {
        Set<String> seen = new HashSet<>(Arrays.asList(deadends));
        if (seen.contains("0000")) return -1;
        if (target.equals("0000")) return 0;
        Queue<String> q = new ArrayDeque<>();
        Queue<Integer> dq = new ArrayDeque<>();
        q.offer("0000");
        dq.offer(0);
        seen.add("0000");
        int[] deltas = {1, 9};
        while (!q.isEmpty()) {
            String s = q.poll();
            int d = dq.poll();
            char[] arr = s.toCharArray();
            for (int i = 0; i < 4; i++) {
                char orig = arr[i];
                for (int delta : deltas) {
                    arr[i] = (char) ('0' + (orig - '0' + delta) % 10);
                    String t = new String(arr);
                    if (seen.contains(t)) continue;
                    if (t.equals(target)) return d + 1;
                    seen.add(t);
                    q.offer(t);
                    dq.offer(d + 1);
                }
                arr[i] = orig;
            }
        }
        return -1;
    }
}