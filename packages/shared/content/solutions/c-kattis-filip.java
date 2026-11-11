class Solution {
    private int rev(int x) {
        int r = 0;
        while (x > 0) {
            r = r * 10 + x % 10;
            x /= 10;
        }
        return r;
    }

    public int reverseAndCompare(int a, int b) {
        return Math.max(rev(a), rev(b));
    }
}
