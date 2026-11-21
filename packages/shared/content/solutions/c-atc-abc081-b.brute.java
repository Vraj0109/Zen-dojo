class Solution {
    public int shiftOnly(int[] a) {
        int ops = 0;
        while (true) {
            for (int x : a) {
                if (x % 2 != 0) return ops;
            }
            for (int i = 0; i < a.length; i++) {
                a[i] /= 2;
            }
            ops++;
        }
    }
}
