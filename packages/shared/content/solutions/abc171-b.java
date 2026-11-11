import java.util.Arrays;

class Solution {
    public int cheapestMix(int k, int[] p) {
        int[] q = p.clone();
        Arrays.sort(q);
        int sum = 0;
        for (int i = 0; i < k; i++) sum += q[i];
        return sum;
    }
}
