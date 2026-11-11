class Solution {
    public int countAvailableRooms(int[][] rooms) {
        int ans = 0;
        for (int[] r : rooms) {
            if (r[1] - r[0] >= 2) ans++;
        }
        return ans;
    }
}
