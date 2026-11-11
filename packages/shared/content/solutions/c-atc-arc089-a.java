class Solution {
    public boolean canFollowPlan(int[][] plan) {
        long t = 0, x = 0, y = 0;
        for (int[] p : plan) {
            long dt = p[0] - t;
            long d = Math.abs((long)p[1] - x) + Math.abs((long)p[2] - y);
            if (d > dt || (dt - d) % 2 != 0) return false;
            t = p[0];
            x = p[1];
            y = p[2];
        }
        return true;
    }
}
