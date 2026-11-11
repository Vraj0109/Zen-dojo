import java.util.*;

class Solution {
    public int ferrisWheel(int[] weights, int x) {
        Arrays.sort(weights);
        int i = 0, j = weights.length - 1;
        int gondolas = 0;
        while (i <= j) {
            if (i < j && weights[i] + weights[j] <= x) {
                i++;
            }
            j--;
            gondolas++;
        }
        return gondolas;
    }
}
