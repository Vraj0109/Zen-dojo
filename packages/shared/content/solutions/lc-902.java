class Solution {
    public int atMostNGivenDigitSet(String[] digits, int n) {
        String s = String.valueOf(n);
        int L = s.length(), d = digits.length;
        long total = 0, p = 1;
        for (int len = 1; len < L; len++) {
            p *= d;
            total += p;
        }
        for (int i = 0; i < L; i++) {
            boolean same = false;
            long below = 0;
            for (String dg : digits) {
                if (dg.charAt(0) < s.charAt(i)) below++;
                else if (dg.charAt(0) == s.charAt(i)) same = true;
            }
            long rest = 1;
            for (int k = 0; k < L - i - 1; k++) rest *= d;
            total += below * rest;
            if (!same) return (int) total;
        }
        return (int) (total + 1);
    }
}