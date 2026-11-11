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
    private int build(int l, int r, int[] a) {
        if (l == r) return newNode(0, 0, a[l]);
        int m = (l + r) / 2;
        int x = build(l, m, a);
        int y = build(m + 1, r, a);
        return newNode(x, y, S[x] + S[y]);
    }
    private int update(int v, int l, int r, int p, long x) {
        if (l == r) return newNode(0, 0, x);
        int m = (l + r) / 2;
        int nl = L[v], nr = R[v];
        if (p <= m) nl = update(nl, l, m, p, x);
        else nr = update(nr, m + 1, r, p, x);
        return newNode(nl, nr, S[nl] + S[nr]);
    }
    private long query(int v, int l, int r, int a, int b) {
        if (a <= l && r <= b) return S[v];
        int m = (l + r) / 2;
        long s = 0;
        if (a <= m) s += query(L[v], l, m, a, b);
        if (b > m) s += query(R[v], m + 1, r, a, b);
        return s;
    }
    public long[] rangeQueriesAndCopies(int[] arr, int[][] queries) {
        int n = arr.length;
        int cap = 2 * n + 20 * queries.length + 10;
        L = new int[cap];
        R = new int[cap];
        S = new long[cap];
        ptr = 0;
        newNode(0, 0, 0);
        List<Integer> root = new ArrayList<>();
        root.add(build(0, n - 1, arr));
        List<Long> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                root.set(k, update(root.get(k), 0, n - 1, q[2] - 1, q[3]));
            } else if (q[0] == 2) {
                ans.add(query(root.get(q[1] - 1), 0, n - 1, q[2] - 1, q[3] - 1));
            } else {
                root.add(root.get(q[1] - 1));
            }
        }
        long[] res = new long[ans.size()];
        for (int i = 0; i < ans.size(); i++) res[i] = ans.get(i);
        return res;
    }
}
