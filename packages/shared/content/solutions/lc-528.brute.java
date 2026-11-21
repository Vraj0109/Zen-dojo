import java.util.*;

class Solution {
    private final int[] weights;
    private final Random rand = new Random();

    public Solution(int[] w) {
        this.weights = w;
    }

    public int pickIndex() {
        long total = 0;
        for (int x : weights) total += x;
        long target = (long)(rand.nextDouble() * total) + 1;
        long running = 0;
        for (int i = 0; i < weights.length; i++) {
            running += weights[i];
            if (running >= target) return i;
        }
        return weights.length - 1;
    }
}
