import java.util.*;

class Solution {
    public int[][] twoSets(int n) {
        long total = (long) n * (n + 1) / 2;
        if (total % 2 != 0) return new int[][]{};
        long target = total / 2;
        List<Integer> s1 = new ArrayList<>();
        List<Integer> s2 = new ArrayList<>();
        for (int i = n; i >= 1; i--) {
            if (target >= i) {
                s1.add(i);
                target -= i;
            } else {
                s2.add(i);
            }
        }
        Collections.reverse(s1);
        Collections.reverse(s2);
        int[] arr1 = new int[s1.size()];
        for (int i = 0; i < s1.size(); i++) arr1[i] = s1.get(i);
        int[] arr2 = new int[s2.size()];
        for (int i = 0; i < s2.size(); i++) arr2[i] = s2.get(i);
        return new int[][]{arr1, arr2};
    }
}
