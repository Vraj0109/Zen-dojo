import java.util.*;

class Solution {
    static class Node {
        long sum, pref, suf, best;
        Node(long s, long p, long sf, long b) {
            sum = s; pref = p; suf = sf; best = b;
        }
    }
    private static Node leaf(long x) {
        long p = Math.max(0L, x);
        return new Node(x, p, p, p);
    }
    private static Node merge(Node l, Node r) {
        long s = l.sum + r.sum;
        long p = Math.max(l.pref, l.sum + r.pref);
        long sf = Math.max(r.suf, r.sum + l.suf);
        long b = Math.max(Math.max(l.best, r.best), l.suf + r.pref);
        return new Node(s, p, sf, b);
    }
    private Node[] t;
    private void build(int v, int l, int r, int[] a) {
        if (l == r) { t[v] = leaf(a[l]); return; }
        int m = (l + r) / 2;
        build(2 * v, l, m, a);
        build(2 * v + 1, m + 1, r, a);
        t[v] = merge(t[2 * v], t[2 * v + 1]);
    }
    private void update(int v, int l, int r, int p, int x) {
        if (l == r) { t[v] = leaf(x); return; }
        int m = (l + r) / 2;
        if (p <= m) update(2 * v, l, m, p, x);
        else update(2 * v + 1, m + 1, r, p, x);
        t[v] = merge(t[2 * v], t[2 * v + 1]);
    }
    public long[] subarraySumQueries(int[] arr, int[][] queries) {
        int n = arr.length;
        t = new Node[4 * n];
        build(1, 0, n - 1, arr);
        long[] ans = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            update(1, 0, n - 1, queries[i][0] - 1, queries[i][1]);
            ans[i] = t[1].best;
        }
        return ans;
    }
}
