import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[] listRemovals(int[] arr, int[] positions) {
        List<Integer> list = new ArrayList<>(arr.length);
        for (int x : arr) list.add(x);
        int[] ans = new int[positions.length];
        for (int i = 0; i < positions.length; i++) {
            int idx = positions[i] - 1;
            ans[i] = list.remove(idx);
        }
        return ans;
    }
}
