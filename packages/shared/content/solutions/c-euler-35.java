class Solution {
    public int circularPrimes(int limit) {
        long bound = 10;
        while (bound < limit) bound *= 10;
        boolean[] comp = new boolean[(int)bound + 1];
        comp[0] = comp[1] = true;
        for (long i = 2; i * i <= bound; i++) {
            if (!comp[(int)i]) {
                for (long j = i * i; j <= bound; j += i) {
                    comp[(int)j] = true;
                }
            }
        }
        int count = 0;
        for (int p = 2; p < limit; p++) {
            if (comp[p]) continue;
            int digits = 0, pw = 1;
            for (int t = p; t > 0; t /= 10) {
                digits++;
                if (t >= 10) pw *= 10;
            }
            boolean ok = true;
            int x = p;
            for (int i = 0; i < digits && ok; i++) {
                x = (x % pw) * 10 + x / pw;
                if (comp[x]) ok = false;
            }
            if (ok) count++;
        }
        return count;
    }
}
