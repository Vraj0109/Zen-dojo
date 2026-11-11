import java.util.*;

class Solution {
    public int slidingPuzzle(int[][] board) {
        StringBuilder start = new StringBuilder();
        for (int[] row : board) {
            for (int x : row) start.append(x);
        }
        String goal = "123450";
        int[][] nb = {{1, 3}, {0, 2, 4}, {1, 5}, {0, 4}, {1, 3, 5}, {2, 4}};
        Set<String> seen = new HashSet<>();
        seen.add(start.toString());
        Queue<String> q = new ArrayDeque<>();
        Queue<Integer> dq = new ArrayDeque<>();
        q.offer(start.toString());
        dq.offer(0);
        while (!q.isEmpty()) {
            String s = q.poll();
            int d = dq.poll();
            if (s.equals(goal)) return d;
            int z = s.indexOf('0');
            char[] arr = s.toCharArray();
            for (int j : nb[z]) {
                char tmp = arr[z];
                arr[z] = arr[j];
                arr[j] = tmp;
                String t = new String(arr);
                if (seen.add(t)) {
                    q.offer(t);
                    dq.offer(d + 1);
                }
                arr[j] = arr[z];
                arr[z] = tmp;
            }
        }
        return -1;
    }
}