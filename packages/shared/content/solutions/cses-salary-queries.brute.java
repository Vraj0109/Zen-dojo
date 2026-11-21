import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[] salaryQueries(int[] salaries, int[][] queries) {
        int[] cur = salaries.clone();
        List<Integer> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int x = q[2];
                cur[k] = x;
            } else {
                int a = q[1];
                int b = q[2];
                int count = 0;
                for (int s : cur) {
                    if (s >= a && s <= b) count++;
                }
                ansList.add(count);
            }
        }
        int[] ans = new int[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
