import java.util.*;

class Solution {
    public int[] concertTickets(int[] tickets, int[] maxPrices) {
        TreeMap<Integer, Integer> map = new TreeMap<>();
        for (int t : tickets) {
            map.put(t, map.getOrDefault(t, 0) + 1);
        }
        int[] ans = new int[maxPrices.length];
        for (int i = 0; i < maxPrices.length; i++) {
            Integer floorKey = map.floorKey(maxPrices[i]);
            if (floorKey == null) {
                ans[i] = -1;
            } else {
                ans[i] = floorKey;
                int count = map.get(floorKey);
                if (count == 1) {
                    map.remove(floorKey);
                } else {
                    map.put(floorKey, count - 1);
                }
            }
        }
        return ans;
    }
}
