class Solution {
    public int[] alarmEarlier(int h, int m) {
        int t = (h * 60 + m - 45 + 1440) % 1440;
        return new int[]{t / 60, t % 60};
    }
}
