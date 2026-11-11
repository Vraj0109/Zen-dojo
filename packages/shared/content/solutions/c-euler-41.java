class Solution {
    private static boolean isPrime(int v) {
        if (v < 2) return false;
        for (long d = 2; d * d <= v; d++) {
            if (v % d == 0) return false;
        }
        return true;
    }

    private static boolean prevPermutation(char[] a) {
        int i = a.length - 2;
        while (i >= 0 && a[i] <= a[i + 1]) i--;
        if (i < 0) return false;
        int j = a.length - 1;
        while (a[j] >= a[i]) j--;
        char t = a[i]; a[i] = a[j]; a[j] = t;
        int l = i + 1, r = a.length - 1;
        while (l < r) {
            t = a[l]; a[l] = a[r]; a[r] = t;
            l++; r--;
        }
        return true;
    }

    public int pandigitalPrime(int n) {
        if (n == 8 || n == 9) return 0;
        char[] s = new char[n];
        for (int d = n; d >= 1; d--) s[n - d] = (char)('0' + d);
        do {
            int v = Integer.parseInt(new String(s));
            if (isPrime(v)) return v;
        } while (prevPermutation(s));
        return 0;
    }
}
