import java.util.*;

class Solution {
    public int[] concertTickets(int[] tickets, int[] maxPrices) {
        List<Integer> remaining = new ArrayList<>();
        for (int t : tickets) remaining.add(t);
        int[] ans = new int[maxPrices.length];
        for (int j = 0; j < maxPrices.length; j++) {
            int p = maxPrices[j];
            int bestIdx = -1;
            for (int i = 0; i < remaining.size(); i++) {
                if (remaining.get(i) <= p) {
                    if (bestIdx == -1 || remaining.get(i) > remaining.get(bestIdx)) {
                        bestIdx = i;
                    }
                }
            }
            if (bestIdx != -1) {
                ans[j] = remaining.remove(bestIdx);
            } else {
                ans[j] = -1;
            }
        }
        return ans;
    }
}
