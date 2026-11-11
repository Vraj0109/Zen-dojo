import java.util.*;

class Solution {
    static class Node {
        long sum, pref;
        Node(long sum, long pref) { this.sum = sum; this.pref = pref; }
    }
    private static Node merge(Node l, Node r) {
        return new Node(l.sum + r.sum, Math.max(l.pref, l.sum + r.pref));
    }
    private Node[] t;
    private void build(int v, int l, int r, int[] a) {
        if (l == r) {
            t[v] = new Node(a[l], Math.max(0, a[l]));
            return;
        }
        int m = (l + r) / 2;
        build(2 * v, l, m, a);
        build(2 * v + 1, m + 1, r, a);
        t[v] = merge(t[2 * v], t[2 * v + 1]);
    }
    private void update(int v, int l, int r, int p, int x) {
        if (l == r) {
            t[v] = new Node(x, Math.max(0, x));
            return;
        }
        int m = (l + r) / 2;
        if (p <= m) update(2 * v, l, m, p, x);
        else update(2 * v + 1, m + 1, r, p, x);
        t[v] = merge(t[2 * v], t[2 * v + 1]);
    }
    private Node query(int v, int l, int r, int a, int b) {
        if (a <= l && r <= b) return t[v];
        int m = (l + r) / 2;
        if (b <= m) return query(2 * v, l, m, a, b);
        if (a > m) return query(2 * v + 1, m + 1, r, a, b);
        return merge(query(2 * v, l, m, a, b), query(2 * v + 1, m + 1, r, a, b));
    }
    public long[] prefixSumQueries(int[] arr, int[][] queries) {
        int n = arr.length;
        t = new Node[4 * n];
        build(1, 0, n - 1, arr);
        List<Long> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                update(1, 0, n - 1, q[1] - 1, q[2]);
            } else {
                ans.add(query(1, 0, n - 1, q[1] - 1, q[2] - 1).pref);
            }
        }
        long[] res = new long[ans.size()];
        for (int i = 0; i < ans.size(); i++) res[i] = ans.get(i);
        return res;
    }
}
