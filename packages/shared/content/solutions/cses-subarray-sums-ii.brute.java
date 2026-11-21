class Solution {
    public long subarraySumsII(int[] arr, int target) {
        int n = arr.length;
        long count = 0;
        for (int i = 0; i < n; i++) {
            long s = 0;
            for (int j = i; j < n; j++) {
                s += arr[j];
                if (s == target) count++;
            }
        }
        return count;
    }
}
