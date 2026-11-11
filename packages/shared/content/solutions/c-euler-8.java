class Solution {
    public long largestProduct(String digits, int k) {
        long best = 0;
        for (int i = 0; i + k <= digits.length(); i++) {
            long p = 1;
            for (int j = i; j < i + k; j++) p *= digits.charAt(j) - '0';
            best = Math.max(best, p);
        }
        return best;
    }
}
