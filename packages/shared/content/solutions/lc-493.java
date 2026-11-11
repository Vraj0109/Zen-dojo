import java.util.*;

class Solution {
    private long count(int[] a, int[] tmp, int lo, int hi) {
        if (hi - lo <= 1) return 0;
        int mid = (lo + hi) / 2;
        long res = count(a, tmp, lo, mid) + count(a, tmp, mid, hi);
        int j = mid;
        for (int i = lo; i < mid; i++) {
            while (j < hi && (long) a[i] > 2L * a[j]) j++;
            res += j - mid;
        }
        int p1 = lo, p2 = mid, p = lo;
        while (p1 < mid && p2 < hi) {
            if (a[p1] <= a[p2]) tmp[p++] = a[p1++];
            else tmp[p++] = a[p2++];
        }
        while (p1 < mid) tmp[p++] = a[p1++];
        while (p2 < hi) tmp[p++] = a[p2++];
        System.arraycopy(tmp, lo, a, lo, hi - lo);
        return res;
    }
    public int reversePairs(int[] nums) {
        int[] tmp = new int[nums.length];
        return (int) count(nums, tmp, 0, nums.length);
    }
}