import java.util.*;

class Solution {
    private int gcd(int a, int b) {
        return b == 0 ? a : gcd(b, a % b);
    }
    public int maxPoints(int[][] points) {
        int n = points.length;
        if (n <= 2) return n;
        int best = 1;
        for (int i = 0; i < n; i++) {
            Map<String, Integer> cnt = new HashMap<>();
            for (int j = i + 1; j < n; j++) {
                int dx = points[j][0] - points[i][0];
                int dy = points[j][1] - points[i][1];
                int g = gcd(Math.abs(dx), Math.abs(dy));
                dx /= g;
                dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) {
                    dx = -dx;
                    dy = -dy;
                }
                String key = dx + "," + dy;
                int c = cnt.getOrDefault(key, 0) + 1;
                cnt.put(key, c);
                best = Math.max(best, c + 1);
            }
        }
        return best;
    }
}