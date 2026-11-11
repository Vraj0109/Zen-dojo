import java.util.*;

class Solution {
    public int totalFruit(int[] fruits) {
        Map<Integer, Integer> basket = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < fruits.length; right++) {
            basket.put(fruits[right], basket.getOrDefault(fruits[right], 0) + 1);
            while (basket.size() > 2) {
                int c = basket.get(fruits[left]);
                if (c == 1) basket.remove(fruits[left]);
                else basket.put(fruits[left], c - 1);
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}