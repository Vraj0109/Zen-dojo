class Solution {
    public int wrongSubtraction(int n, int k) {
        for (int i = 0; i < k; i++) {
            if (n % 10 == 0) n /= 10;
            else n--;
        }
        return n;
    }
}
