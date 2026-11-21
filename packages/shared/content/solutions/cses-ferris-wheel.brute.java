import java.util.Arrays;

class Solution {
    public int ferrisWheel(int[] weights, int x) {
        Arrays.sort(weights);
        int left = 0, right = weights.length - 1;
        int gondolas = 0;
        while (left <= right) {
            if (left < right && weights[left] + weights[right] <= x) {
                left++;
            }
            right--;
            gondolas++;
        }
        return gondolas;
    }
}
