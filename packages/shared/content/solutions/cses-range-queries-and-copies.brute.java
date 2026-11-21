import java.util.ArrayList;
import java.util.List;

class Solution {
    public long[] rangeQueriesAndCopies(int[] arr, int[][] queries) {
        List<long[]> arrays = new ArrayList<>();
        long[] init = new long[arr.length];
        for (int i = 0; i < arr.length; i++) init[i] = arr[i];
        arrays.add(init);

        List<Long> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int a = q[2] - 1;
                long x = q[3];
                arrays.get(k)[a] = x;
            } else if (q[0] == 2) {
                int k = q[1] - 1;
                int a = q[2] - 1;
                int b = q[3] - 1;
                long[] target = arrays.get(k);
                long sum = 0;
                for (int i = a; i <= b; i++) {
                    sum += target[i];
                }
                ansList.add(sum);
            } else {
                int k = q[1] - 1;
                arrays.add(arrays.get(k).clone());
            }
        }
        long[] ans = new long[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
