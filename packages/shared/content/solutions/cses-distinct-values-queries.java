import java.util.*;

class Solution {
    private int n;
    private int[] bit;
    private void add(int i, int v) {
        for (; i <= n; i += i & -i) bit[i] += v;
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
    public int[] distinctValuesQueries(int[] arr, int[][] queries) {
        n = arr.length;
        int q = queries.length;
        int[] vals = arr.clone();
        Arrays.sort(vals);
        int uniqueCount = 0;
        for (int i = 0; i < n; i++) {
            if (i == 0 || vals[i] != vals[i - 1]) vals[uniqueCount++] = vals[i];
        }
        int[] uvals = Arrays.copyOf(vals, uniqueCount);
        int[] comp = new int[n];
        for (int i = 0; i < n; i++) {
            comp[i] = lowerBound(uvals, arr[i]);
        }
        Integer[] byRight = new Integer[q];
        for (int i = 0; i < q; i++) byRight[i] = i;
        Arrays.sort(byRight, Comparator.comparingInt(x -> queries[x][1]));
        bit = new int[n + 1];
        int[] last = new int[uniqueCount];
        int[] ans = new int[q];
        int pos = 0;
        for (int id : byRight) {
            while (pos < queries[id][1]) {
                pos++;
                int c = comp[pos - 1];
                if (last[c] != 0) add(last[c], -1);
                add(pos, 1);
                last[c] = pos;
            }
            ans[id] = pre(queries[id][1]) - pre(queries[id][0] - 1);
        }
        return ans;
    }
}
