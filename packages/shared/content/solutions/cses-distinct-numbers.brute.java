import java.util.*;

class Solution {
    public int distinctNumbers(int[] arr) {
        List<Integer> unique = new ArrayList<>();
        for (int x : arr) {
            boolean found = false;
            for (int u : unique) {
                if (u == x) {
                    found = true;
                    break;
                }
            }
            if (!found) unique.add(x);
        }
        return unique.size();
    }
}
