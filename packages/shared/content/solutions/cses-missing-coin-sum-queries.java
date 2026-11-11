import java.util.*;

class Solution {
    private int[] L, R;
    private long[] S;
    private int ptr = 0;
    private int newNode(int l, int r, long s) {
        if (ptr == L.length) {
            int newCap = L.length * 2;
            L = Arrays.copyOf(L, newCap);
            R = Arrays.copyOf(R, newCap);
            S = Arrays.copyOf(S, newCap);
        }
        L[ptr] = l;
        R[ptr] = r;
        S[ptr] = s;
        return ptr++;
    }
    private int add(int v, int l, int r, int p, long x) {
        int nl = L[v], nr = R[v];
        if (l == r) return newNode(0, 0, S[v] + x);
        int m = (l + r) / 2;
        if (p <= m) nl = add(nl, l, m, p, x);
        else nr = add(nr, m + 1, r, p, x);
        return newNode(nl, nr, S[nl] + S[nr]);
    }
    private long query(int v, int l, int r, int a, int b) {
        if (v == 0 || b < l || r < a) return 0;
        if (a <= l && r <= b) return S[v];
        int m = (l + r) / 2;
        return query(L[v], l, m, a, b) + query(R[v], m + 1, r, a, b);
    }
    private int upperBound(long[] arr, long x) {
        int l = 0, r = arr.length;
        while (l < r) {
            int mid = (l + r) >>> 1;
            if (arr[mid] > x) r = mid;
            else l = mid + 1;
        }
        return l;
    }
    public long[] missingCoinSumQueries(int[] coins, int[][] queries) {
        int n = coins.length;
        Integer[] order = new Integer[n];
        for (int i = 0; i < n; i++) order[i] = i;
        Arrays.sort(order, Comparator.comparingInt(x -> coins[x]));
        long[] sortedVals = new long[n];
        for (int i = 0; i < n; i++) sortedVals[i] = coins[order[i]];
        int cap = 20 * n + 10;
        L = new int[cap];
        R = new int[cap];
        S = new long[cap];
        ptr = 0;
        newNode(0, 0, 0);
        int[] root = new int[n + 1];
        for (int i = 0; i < n; i++) {
            root[i + 1] = add(root[i], 0, n - 1, order[i], coins[order[i]]);
        }
        long[] ans = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int[] q = queries[i];
            long s = 0;
            while (true) {
                int c = upperBound(sortedVals, s + 1);
                long t = query(root[c], 0, n - 1, q[0] - 1, q[1] - 1);
                if (t == s) break;
                s = t;
            }
            ans[i] = s + 1;
        }
        return ans;
    }
}
