class Solution {
    public int playDays(int n, int[] a) {
        long sum = 0;
        for (int x : a) sum += x;
        return sum > n ? -1 : (int)(n - sum);
    }
}
