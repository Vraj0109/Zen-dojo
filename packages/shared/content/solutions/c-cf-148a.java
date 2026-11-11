class Solution {
    public int countDamagedDragons(int k, int l, int m, int n, int d) {
        int count = 0;
        for (int i = 1; i <= d; i++) {
            if (i % k == 0 || i % l == 0 || i % m == 0 || i % n == 0) {
                count++;
            }
        }
        return count;
    }
}
