import java.util.*;

class Solution {
    private int m;
    private int[] bit;
    private void add(int i, int v) {
        for (; i <= m; i += i & -i) bit[i] += v;
    }
    private int pre(int i) {
        int s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }
    private int lowerBound(int[] arr, int x) {
        int l = 0, r = arr.length;
        while (l < r) {
            int mid = (l + r) >>> 1;
            if (arr[mid] >= x) r = mid;
            else l = mid + 1;
        }
        return l;
    }
    private int upperBound(int[] arr, int x) {
        int l = 0, r = arr.length;
        while (l < r) {
            int mid = (l + r) >>> 1;
            if (arr[mid] > x) r = mid;
            else l = mid + 1;
        }
        return l;
    }
    public int[] salaryQueries(int[] salaries, int[][] queries) {
        int n = salaries.length;
        int count1 = 0;
        for (int[] q : queries) if (q[0] == 1) count1++;
        int[] vals = new int[n + count1];
        System.arraycopy(salaries, 0, vals, 0, n);
        int idx = n;
        for (int[] q : queries) if (q[0] == 1) vals[idx++] = q[2];
        Arrays.sort(vals);
        int uniqueCount = 0;
        for (int i = 0; i < vals.length; i++) {
            if (i == 0 || vals[i] != vals[i - 1]) {
                vals[uniqueCount++] = vals[i];
            }
        }
        int[] uvals = Arrays.copyOf(vals, uniqueCount);
        m = uniqueCount;
        bit = new int[m + 1];
        int[] cur = salaries.clone();
        for (int v : cur) {
            add(lowerBound(uvals, v) + 1, 1);
        }
        List<Integer> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int oldVal = cur[q[1] - 1];
                add(lowerBound(uvals, oldVal) + 1, -1);
                cur[q[1] - 1] = q[2];
                add(lowerBound(uvals, q[2]) + 1, 1);
            } else {
                int lo = lowerBound(uvals, q[1]);
                int hi = upperBound(uvals, q[2]);
                ans.add(pre(hi) - pre(lo));
            }
        }
        int[] res = new int[ans.size()];
        for (int i = 0; i < ans.size(); i++) res[i] = ans.get(i);
        return res;
    }
}
