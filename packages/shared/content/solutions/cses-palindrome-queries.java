import java.util.ArrayList;
import java.util.List;

class Solution {
    private static class Fenwick {
        int n;
        long mod;
        long[] tree;
        Fenwick(int n, long mod) {
            this.n = n;
            this.mod = mod;
            this.tree = new long[n + 1];
        }
        void add(int i, long delta) {
            delta = (delta % mod + mod) % mod;
            for (; i <= n; i += i & -i) {
                tree[i] = (tree[i] + delta) % mod;
            }
        }
        long query(int i) {
            long sum = 0;
            for (; i > 0; i -= i & -i) {
                sum = (sum + tree[i]) % mod;
            }
            return sum;
        }
        long queryRange(int l, int r) {
            return (query(r) - query(l - 1) + mod) % mod;
        }
    }

    private static long power(long base, long exp, long mod) {
        long res = 1;
        base %= mod;
        while (exp > 0) {
            if ((exp & 1) == 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }

    private static long modInverse(long n, long m) {
        return power(n, m - 2, m);
    }

    public String[] palindromeQueries(String s, String[][] queries) {
        int n = s.length();
        long MOD1 = 1000000007L;
        long B1 = 313L;
        long MOD2 = 1000000009L;
        long B2 = 353L;

        long[] p1 = new long[n + 1], invP1 = new long[n + 1];
        long[] p2 = new long[n + 1], invP2 = new long[n + 1];
        p1[0] = 1; invP1[0] = 1;
        p2[0] = 1; invP2[0] = 1;
        long invB1 = modInverse(B1, MOD1);
        long invB2 = modInverse(B2, MOD2);

        for (int i = 1; i <= n; i++) {
            p1[i] = (p1[i - 1] * B1) % MOD1;
            invP1[i] = (invP1[i - 1] * invB1) % MOD1;
            p2[i] = (p2[i - 1] * B2) % MOD2;
            invP2[i] = (invP2[i - 1] * invB2) % MOD2;
        }

        Fenwick fwd1 = new Fenwick(n, MOD1), rev1 = new Fenwick(n, MOD1);
        Fenwick fwd2 = new Fenwick(n, MOD2), rev2 = new Fenwick(n, MOD2);

        char[] sArr = s.toCharArray();
        for (int i = 1; i <= n; i++) {
            long val = sArr[i - 1];
            fwd1.add(i, val * p1[i - 1]);
            rev1.add(i, val * p1[n - i]);
            fwd2.add(i, val * p2[i - 1]);
            rev2.add(i, val * p2[n - i]);
        }

        List<String> results = new ArrayList<>();
        for (String[] q : queries) {
            if (q[0].equals("1")) {
                int k = Integer.parseInt(q[1]);
                char c = q[2].charAt(0);
                long oldVal = sArr[k - 1];
                long newVal = c;
                long diff = newVal - oldVal;
                sArr[k - 1] = c;

                fwd1.add(k, diff * p1[k - 1]);
                rev1.add(k, diff * p1[n - k]);
                fwd2.add(k, diff * p2[k - 1]);
                rev2.add(k, diff * p2[n - k]);
            } else {
                int a = Integer.parseInt(q[1]);
                int b = Integer.parseInt(q[2]);

                long hFwd1 = (fwd1.queryRange(a, b) * invP1[a - 1]) % MOD1;
                long hRev1 = (rev1.queryRange(a, b) * invP1[n - b]) % MOD1;

                long hFwd2 = (fwd2.queryRange(a, b) * invP2[a - 1]) % MOD2;
                long hRev2 = (rev2.queryRange(a, b) * invP2[n - b]) % MOD2;

                if (hFwd1 == hRev1 && hFwd2 == hRev2) {
                    results.add("YES");
                } else {
                    results.add("NO");
                }
            }
        }
        return results.toArray(new String[0]);
    }
}
