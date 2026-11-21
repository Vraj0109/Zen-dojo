import java.util.*;

class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        List<Integer> merged = new ArrayList<>();
        for (int x : nums1) merged.add(x);
        for (int x : nums2) merged.add(x);
        Collections.sort(merged);
        int n = merged.size();
        if (n % 2 == 1) return (double)merged.get(n / 2);
        return (merged.get(n / 2 - 1) + merged.get(n / 2)) / 2.0;
    }
}
