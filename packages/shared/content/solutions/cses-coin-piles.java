class Solution {
    public boolean coinPiles(int a, int b) {
        if ((long) (a + b) % 3 != 0) return false;
        return (long) a <= 2L * b && (long) b <= 2L * a;
    }
}
