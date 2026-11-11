class Solution {
    public String[] pointLocationTest(int[][] queries) {
        String[] ans = new String[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int[] q = queries[i];
            long x1 = q[0], y1 = q[1];
            long x2 = q[2], y2 = q[3];
            long x3 = q[4], y3 = q[5];
            long cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
            if (cross > 0) ans[i] = "LEFT";
            else if (cross < 0) ans[i] = "RIGHT";
            else ans[i] = "TOUCH";
        }
        return ans;
    }
}
