class Solution {
    public int nthPrime(int n) {
        int limit = 100;
        if (n >= 6) limit = (int) (n * (Math.log(n) + Math.log(Math.log(n)))) + 10;
        boolean[] composite = new boolean[limit + 1];
        int count = 0;
        for (int i = 2; i <= limit; i++) {
            if (composite[i]) continue;
            if (++count == n) return i;
            for (long j = (long) i * i; j <= limit; j += i) composite[(int) j] = true;
        }
        return -1;
    }
}
