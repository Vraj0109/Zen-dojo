import java.util.HashSet;
import java.util.Set;

class Solution {
    public int[] distinctValuesQueries(int[] arr, int[][] queries) {
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0] - 1;
            int b = queries[q][1] - 1;
            Set<Integer> set = new HashSet<>();
            for (int i = a; i <= b; i++) {
                set.add(arr[i]);
            }
            ans[q] = set.size();
        }
        return ans;
    }
}
