class Solution {
    public int[] directReports(int[] a) {
        int[] cnt = new int[a.length + 1];
        for (int b : a) cnt[b - 1]++;
        return cnt;
    }
}
