class Solution {
    public boolean coinPiles(int a, int b) {
        if ((a + b) % 3 != 0) return false;
        long la = a, lb = b;
        return la <= 2L * lb && lb <= 2L * la;
    }
}
