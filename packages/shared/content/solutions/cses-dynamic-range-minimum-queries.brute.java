import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[] dynamicRangeMinimumQueries(int[] arr, int[][] queries) {
        int[] a = arr.clone();
        List<Integer> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int u = q[2];
                a[k] = u;
            } else {
                int l = q[1] - 1;
                int r = q[2] - 1;
                int minVal = a[l];
                for (int i = l + 1; i <= r; i++) {
                    if (a[i] < minVal) minVal = a[i];
                }
                ansList.add(minVal);
            }
        }
        int[] ans = new int[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
