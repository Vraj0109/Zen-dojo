class Solution {
    private int dfs(int[][] items, int idx, int m, int n) {
        if (idx == items.length) return 0;
        int res = dfs(items, idx + 1, m, n);
        if (m >= items[idx][0] && n >= items[idx][1]) {
            res = Math.max(res, 1 + dfs(items, idx + 1, m - items[idx][0], n - items[idx][1]));
        }
        return res;
    }

    public int findMaxForm(String[] strs, int m, int n) {
        int[][] items = new int[strs.length][2];
        for (int i = 0; i < strs.length; i++) {
            int z = 0;
            for (char c : strs[i].toCharArray()) if (c == '0') z++;
            items[i][0] = z;
            items[i][1] = strs[i].length() - z;
        }
        return dfs(items, 0, m, n);
    }
}
